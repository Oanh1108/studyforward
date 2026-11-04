"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';

export type VoiceState = 'idle' | 'listening' | 'processing';

interface Options {
  /** Called with the recognised text once the user has finished speaking. */
  onTranscript: (text: string) => void;
  /** Server-side speech-to-text for browsers without the Web Speech API (or when it fails). */
  transcribeOnServer: (base64: string, mimeType: string) => Promise<string>;
}

/** The subset of the Web Speech API this hook uses (not in the standard DOM typings). */
interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((e: { resultIndex: number; results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}
type RecognitionCtor = new () => SpeechRecognitionLike;
const getRecognition = (): RecognitionCtor | null => {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
};

const toBase64 = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onloadend = () => resolve(String(r.result).split(',')[1] ?? '');
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });

function micErrorMessage(err: unknown): string {
  const name = (err as DOMException)?.name;
  if (name === 'NotAllowedError' || name === 'SecurityError') return 'Bạn đã chặn quyền dùng micro. Hãy cho phép micro trong cài đặt trình duyệt rồi thử lại.';
  if (name === 'NotFoundError' || name === 'OverconstrainedError') return 'Không tìm thấy micro trên thiết bị này.';
  if (name === 'NotReadableError') return 'Micro đang được ứng dụng khác sử dụng.';
  return 'Không thể bật micro. Hãy thử lại.';
}

/**
 * Real speech input. Uses the browser's Web Speech API when present (live interim text);
 * otherwise, or if it fails on the network, records with MediaRecorder and transcribes on the server.
 */
export function useVoiceInput({ onTranscript, transcribeOnServer }: Options) {
  const [state, setState] = useState<VoiceState>('idle');
  const [interim, setInterim] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [level, setLevel] = useState(0); // 0..1 live microphone level (recorder path)
  const forceServer = useRef(false);

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const rafRef = useRef<number | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const cbRef = useRef({ onTranscript, transcribeOnServer });
  useEffect(() => { cbRef.current = { onTranscript, transcribeOnServer }; });

  const supported = useSyncExternalStore(
    () => () => {},
    () => !!getRecognition() || (!!navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== 'undefined'),
    () => false,
  );

  const cleanupStream = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    audioCtxRef.current?.close().catch(() => {});
    audioCtxRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setLevel(0);
  }, []);

  const startRecorder = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setError('Trình duyệt này chưa hỗ trợ ghi âm.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mime = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg'].find((m) => MediaRecorder.isTypeSupported(m));
      const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      chunksRef.current = [];
      rec.ondataavailable = (e) => e.data.size && chunksRef.current.push(e.data);
      rec.onstop = async () => {
        const type = rec.mimeType || mime || 'audio/webm';
        const blob = new Blob(chunksRef.current, { type });
        cleanupStream();
        if (blob.size < 1000) {
          setState('idle');
          setError('Không thu được âm thanh. Hãy thử nói lại.');
          return;
        }
        setState('processing');
        try {
          const text = (await cbRef.current.transcribeOnServer(await toBase64(blob), type)).trim();
          setState('idle');
          if (text) cbRef.current.onTranscript(text);
          else setError('Không nhận diện được giọng nói. Hãy thử nói rõ hơn.');
        } catch (e) {
          setState('idle');
          setError((e as Error).message || 'Không nhận diện được giọng nói.');
        }
      };
      recorderRef.current = rec;

      // Real input level so the user can see the mic is picking up sound.
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (Ctx) {
        const ctx = new Ctx();
        audioCtxRef.current = ctx;
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        ctx.createMediaStreamSource(stream).connect(analyser);
        const data = new Uint8Array(analyser.frequencyBinCount);
        const tick = () => {
          analyser.getByteTimeDomainData(data);
          let peak = 0;
          for (const v of data) peak = Math.max(peak, Math.abs(v - 128));
          setLevel(Math.min(1, peak / 64));
          rafRef.current = requestAnimationFrame(tick);
        };
        tick();
      }
      rec.start();
      setState('listening');
    } catch (e) {
      cleanupStream();
      setState('idle');
      setError(micErrorMessage(e));
    }
  }, [cleanupStream]);

  const start = useCallback(() => {
    if (state !== 'idle') return;
    setError(null);
    setInterim('');
    const Rec = getRecognition();
    if (!Rec || forceServer.current) {
      void startRecorder();
      return;
    }
    const rec = new Rec();
    rec.lang = 'en-US';
    rec.interimResults = true;
    rec.continuous = false;
    let finalText = '';
    let failed = false;
    rec.onresult = (e) => {
      let interimText = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) finalText += r[0].transcript;
        else interimText += r[0].transcript;
      }
      setInterim((finalText + interimText).trim());
    };
    rec.onerror = (e) => {
      failed = true;
      const code = e.error;
      if (code === 'not-allowed' || code === 'service-not-allowed') setError('Bạn đã chặn quyền dùng micro. Hãy cho phép micro trong cài đặt trình duyệt rồi thử lại.');
      else if (code === 'audio-capture') setError('Không tìm thấy micro trên thiết bị này.');
      else if (code === 'no-speech') setError('Mình không nghe thấy giọng nói. Hãy thử nói lại.');
      else if (code === 'network' || code === 'language-not-supported') {
        // Browser speech service unreachable: use the server recogniser from now on.
        forceServer.current = true;
        setError('Nhận diện giọng nói của trình duyệt không khả dụng. Lần sau mình sẽ dùng máy chủ, hãy bấm micro lại.');
      } else if (code !== 'aborted') setError('Nhận diện giọng nói bị lỗi. Hãy thử lại.');
    };
    rec.onend = () => {
      recognitionRef.current = null;
      setInterim('');
      setState('idle');
      const text = finalText.trim();
      if (!failed && text) cbRef.current.onTranscript(text);
    };
    try {
      recognitionRef.current = rec;
      rec.start();
      setState('listening');
    } catch {
      recognitionRef.current = null;
      setError('Không thể bắt đầu nhận diện giọng nói. Hãy thử lại.');
    }
  }, [state, startRecorder]);

  const stop = useCallback(() => {
    if (recognitionRef.current) {
      setState('processing');
      recognitionRef.current.stop(); // onend delivers the final transcript
    } else if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      recorderRef.current.stop();
    }
  }, []);

  const cancel = useCallback(() => {
    if (recognitionRef.current) {
      const r = recognitionRef.current;
      r.onend = null;
      r.abort();
      recognitionRef.current = null;
    }
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      recorderRef.current.onstop = null;
      recorderRef.current.stop();
    }
    cleanupStream();
    setInterim('');
    setState('idle');
  }, [cleanupStream]);

  useEffect(() => cancel, [cancel]);

  return { supported, state, interim, error, level, start, stop, cancel, clearError: () => setError(null) };
}
