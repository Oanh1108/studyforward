"use client";

import { useCallback, useEffect, useRef, useState } from 'react';
import { speakText } from '@/components/learning/speechHelper';
import type { AudioClip } from '@/lib/dictation/toeic/types';

export interface PlayRequest {
  text: string;
  clip?: AudioClip;
  audioSrc?: string;
  /** Playback speed, 1 = normal. */
  rate: number;
}

const POLL_MS = 30;
const LOAD_TIMEOUT_MS = 15000;

function whenReady(audio: HTMLAudioElement): Promise<void> {
  if (audio.readyState >= 1) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const done = (fn: () => void) => () => {
      clearTimeout(timer);
      audio.removeEventListener('loadedmetadata', onReady);
      audio.removeEventListener('error', onError);
      fn();
    };
    const onReady = done(resolve);
    const onError = done(() => reject(new Error('audio failed to load')));
    const timer = setTimeout(onError, LOAD_TIMEOUT_MS);
    audio.addEventListener('loadedmetadata', onReady);
    audio.addEventListener('error', onError);
  });
}

/**
 * Plays one sentence: the matching stretch of a recording when there is one, otherwise the browser's voice.
 * Only one thing plays at a time; starting a new sentence stops the previous one.
 */
export function useSegmentPlayer() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef(0);
  const tokenRef = useRef(0);
  const clipRef = useRef<AudioClip | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  /** 0..1 position inside the current recording clip; stays 0 when the browser voice is used. */
  const [progress, setProgress] = useState(0);
  /** Length of the current recording clip in seconds, 0 when it is not a recording. */
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(1);
  const volumeRef = useRef(1);

  const setVolume = useCallback((v: number) => {
    const next = Math.min(1, Math.max(0, v));
    volumeRef.current = next;
    setVolumeState(next);
    if (audioRef.current) audioRef.current.volume = next;
  }, []);

  const stop = useCallback(() => {
    tokenRef.current++;
    window.clearInterval(timerRef.current);
    audioRef.current?.pause();
    window.speechSynthesis?.cancel();
    setIsPlaying(false);
    setProgress(0);
  }, []);

  const startPolling = useCallback(
    (audio: HTMLAudioElement, clip: AudioClip) => {
      window.clearInterval(timerRef.current);
      timerRef.current = window.setInterval(() => {
        if (audio.currentTime >= clip.end || audio.ended) return stop();
        setProgress(Math.min(1, Math.max(0, (audio.currentTime - clip.start) / (clip.end - clip.start))));
      }, POLL_MS);
    },
    [stop],
  );

  /** Jump to a point (0..1) of the current clip and keep playing from there. */
  const seek = useCallback(
    (fraction: number) => {
      const audio = audioRef.current;
      const clip = clipRef.current;
      if (!audio || !clip) return;
      const f = Math.min(1, Math.max(0, fraction));
      audio.currentTime = clip.start + f * (clip.end - clip.start);
      setProgress(f);
      if (audio.paused) {
        tokenRef.current++;
        audio.play().then(() => {
          setIsPlaying(true);
          startPolling(audio, clip);
        }, () => {});
      }
    },
    [startPolling],
  );

  useEffect(
    () => () => {
      stop();
      if (audioRef.current) audioRef.current.src = '';
    },
    [stop],
  );

  const play = useCallback(
    async (request: PlayRequest) => {
      stop();
      const token = ++tokenRef.current;
      setNotice(null);

      const { clip, audioSrc } = request;
      if (clip && audioSrc) {
        try {
          const audio = (audioRef.current ??= new Audio());
          audio.preload = 'auto';
          if (new URL(audioSrc, window.location.href).href !== audio.src) audio.src = audioSrc;
          await whenReady(audio);
          if (token !== tokenRef.current) return;
          audio.playbackRate = request.rate;
          audio.volume = volumeRef.current;
          audio.currentTime = clip.start;
          await audio.play();
          if (token !== tokenRef.current) return;
          clipRef.current = clip;
          setDuration((clip.end - clip.start) / request.rate);
          setIsPlaying(true);
          startPolling(audio, clip);
          return;
        } catch {
          if (token !== tokenRef.current) return;
          setNotice('Không phát được âm thanh gốc, đang dùng giọng đọc của trình duyệt.');
        }
      }

      clipRef.current = null;
      setDuration(0);
      setIsPlaying(true);
      await speakText(request.text, 'en', request.rate);
      if (token === tokenRef.current) setIsPlaying(false);
    },
    [stop, startPolling],
  );

  return { play, stop, seek, isPlaying, notice, progress, duration, volume, setVolume };
}
