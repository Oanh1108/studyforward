"use client";

import { useCallback, useEffect, useRef, useState } from 'react';
import { speakingApi } from '@/lib/speakingApi';
import { SilentRecordingError, getWhisperState, preloadWhisper, subscribeWhisper, transcribeLocally } from '@/lib/localWhisper';
import { pickMicrophone } from '@/lib/microphone';

const MIME_CANDIDATES = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'];
// Only skip recordings that are practically empty; quiet audio is still worth transcribing.
const MIN_AUDIO_BYTES = 200;

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '');
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

/**
 * Records the microphone while the user speaks and transcribes it on the device (Whisper).
 * The user decides when to stop: `finalTranscript` is only set after they tap stop.
 * The browser's built-in SpeechRecognition is deliberately not used: it always opens the system
 * default input, which on some PCs is a silent virtual device, and the app cannot choose another.
 */
export function useSpeechCapture(language: string, preload = false) {
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [finalTranscript, setFinalTranscript] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [level, setLevel] = useState(0);
  const [supported, setSupported] = useState(true);
  const [whisperState, setWhisperState] = useState(getWhisperState());
  const [recordingUrl, setRecordingUrl] = useState<string | null>(null);

  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const rafRef = useRef(0);
  // Bumped on every start/stop so late async steps from an abandoned attempt can bail out.
  const attemptRef = useRef(0);

  // Warm up the on-device model while the user is on the speaking step.
  useEffect(() => {
    if (preload) preloadWhisper().catch(() => {});
  }, [preload]);

  useEffect(() => subscribeWhisper(() => setWhisperState(getWhisperState())), []);

  useEffect(() => {
    setSupported(!!navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== 'undefined');
    return () => {
      attemptRef.current++;
      releaseMedia();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const releaseMedia = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = 0;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    audioCtxRef.current?.close().catch(() => {});
    audioCtxRef.current = null;
    setLevel(0);
  };

  const openStream = async (): Promise<MediaStream> => {
    const processing = { autoGainControl: true, noiseSuppression: true, echoCancellation: false };
    const deviceId = await pickMicrophone();
    if (deviceId) {
      try {
        return await navigator.mediaDevices.getUserMedia({ audio: { deviceId: { exact: deviceId }, ...processing } });
      } catch {
        // fall through to the browser default
      }
    }
    return navigator.mediaDevices.getUserMedia({ audio: processing });
  };

  const start = useCallback(async () => {
    const attempt = ++attemptRef.current;
    setFinalTranscript(null);
    setError(null);
    setIsRecording(true);

    try {
      const stream = await openStream();
      if (attempt !== attemptRef.current) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      streamRef.current = stream;

      const mimeType = MIME_CANDIDATES.find((m) => MediaRecorder.isTypeSupported(m));
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.start();
      recorderRef.current = recorder;

      // Live level meter so the user can see the microphone is picking them up.
      const ctx = new AudioContext();
      audioCtxRef.current = ctx;
      if (ctx.state === 'suspended') await ctx.resume();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      ctx.createMediaStreamSource(stream).connect(analyser);
      const data = new Uint8Array(analyser.fftSize);
      const tick = () => {
        analyser.getByteTimeDomainData(data);
        let peak = 0;
        for (let i = 0; i < data.length; i++) peak = Math.max(peak, Math.abs(data[i] - 128));
        setLevel(Math.min(1, peak / 64));
        rafRef.current = requestAnimationFrame(tick);
      };
      tick();
    } catch {
      if (attempt !== attemptRef.current) return;
      setError('Không mở được micro. Hãy cho phép micro cho trang này (biểu tượng ổ khóa trên thanh địa chỉ) rồi thử lại.');
      setIsRecording(false);
    }
  }, []);

  const stop = useCallback(async () => {
    const attempt = ++attemptRef.current;
    setIsRecording(false);

    const recorder = recorderRef.current;
    const blob = await new Promise<Blob | null>((resolve) => {
      const done = (type: string) => resolve(chunksRef.current.length ? new Blob(chunksRef.current, { type }) : null);
      if (!recorder || recorder.state === 'inactive') return done(recorder?.mimeType || 'audio/webm');
      recorder.onstop = () => done(recorder.mimeType || 'audio/webm');
      recorder.stop();
    });
    recorderRef.current = null;
    releaseMedia();

    setRecordingUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return blob ? URL.createObjectURL(blob) : null;
    });

    if (!blob || blob.size < MIN_AUDIO_BYTES) {
      setError('Chưa ghi được âm thanh. Hãy bấm mic, đọc to câu trên vài giây rồi bấm lần nữa để dừng.');
      return;
    }

    setIsTranscribing(true);
    try {
      let text = '';
      try {
        text = (await transcribeLocally(blob, language)).text;
      } catch (err) {
        if (err instanceof SilentRecordingError) throw err;
        // On-device model unavailable: fall back to the server.
        text = await speakingApi.transcribeAudio(await blobToBase64(blob), blob.type, language);
      }
      if (attempt !== attemptRef.current) return;
      if (text.trim()) setFinalTranscript(text.trim());
      else setError('Chưa nghe rõ giọng nói trong bản ghi. Hãy bấm nghe lại bản ghi bên dưới: nếu chỉ thấy tiếng ồn hoặc im lặng thì micro chưa thu được giọng bạn.');
    } catch (err: any) {
      if (attempt !== attemptRef.current) return;
      setError(
        err instanceof SilentRecordingError
          ? `Micro gần như không thu được tiếng (mức ${(err.levels.peak * 100).toFixed(1)}%). Hãy kiểm tra micro đang chọn, tăng âm lượng micro trong Windows rồi thử lại.`
          : err?.message || 'Không thể nhận diện giọng nói lúc này. Hãy thử lại.',
      );
    } finally {
      setIsTranscribing(false);
    }
  }, [language]);

  const toggle = useCallback(() => (isRecording ? stop() : start()), [isRecording, start, stop]);

  return {
    isRecording, isTranscribing, finalTranscript, error, level, supported, toggle,
    modelStatus: whisperState.status, modelProgress: whisperState.progress, recordingUrl,
  };
}
