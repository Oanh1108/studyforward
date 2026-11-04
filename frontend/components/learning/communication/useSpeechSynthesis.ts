"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import type { ConvLevel } from '@/lib/communicationApi';

const VOICE_KEY = 'sf-comm-voice';
/** Slower for beginners, natural for advanced learners. */
const RATE: Record<ConvLevel, number> = { A1: 0.8, A2: 0.88, B1: 0.95, B2: 1, C1: 1.05 };

export interface TtsVoice { name: string; lang: string }

/** Browser text-to-speech for the AI teacher. Nothing plays on its own except what the caller asks for. */
export function useSpeechSynthesis(level: ConvLevel) {
  // Hydration-safe feature detection: false on the server, real value in the browser.
  const supported = useSyncExternalStore(() => () => {}, () => 'speechSynthesis' in window, () => false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [voiceName, setVoiceName] = useState<string | null>(() => {
    try { return localStorage.getItem(VOICE_KEY); } catch { return null; }
  });
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const tokenRef = useRef(0);

  useEffect(() => {
    if (!supported) return;
    const load = () => setVoices(window.speechSynthesis.getVoices().filter((v) => v.lang.toLowerCase().startsWith('en')));
    queueMicrotask(load); // some browsers have the voices already, others fire `voiceschanged` later
    window.speechSynthesis.addEventListener('voiceschanged', load);
    return () => window.speechSynthesis.removeEventListener('voiceschanged', load);
  }, [supported]);

  const stop = useCallback(() => {
    if (!supported) return;
    tokenRef.current++;
    window.speechSynthesis.cancel();
    setSpeakingId(null);
  }, [supported]);

  const speak = useCallback(
    (id: string, text: string) => {
      if (!supported || !text.trim()) return;
      window.speechSynthesis.cancel();
      const token = ++tokenRef.current;
      const u = new SpeechSynthesisUtterance(text);
      const all = window.speechSynthesis.getVoices().filter((v) => v.lang.toLowerCase().startsWith('en'));
      // Prefer the saved voice, then a US/UK English one, so pronunciation stays clear.
      const chosen = all.find((v) => v.name === voiceName) ?? all.find((v) => /en[-_](US|GB)/i.test(v.lang)) ?? all[0];
      if (chosen) { u.voice = chosen; u.lang = chosen.lang; } else { u.lang = 'en-US'; }
      u.rate = RATE[level];
      u.onstart = () => token === tokenRef.current && setSpeakingId(id);
      const done = () => token === tokenRef.current && setSpeakingId(null);
      u.onend = done;
      u.onerror = done;
      setSpeakingId(id);
      window.speechSynthesis.speak(u);
    },
    [supported, voiceName, level],
  );

  const chooseVoice = useCallback((name: string) => {
    setVoiceName(name);
    try { localStorage.setItem(VOICE_KEY, name); } catch { /* ignore */ }
  }, []);

  // Never keep talking after leaving the page or switching tabs.
  useEffect(() => {
    if (!supported) return;
    const onHide = () => document.hidden && stop();
    document.addEventListener('visibilitychange', onHide);
    return () => {
      document.removeEventListener('visibilitychange', onHide);
      window.speechSynthesis.cancel();
    };
  }, [supported, stop]);

  return { supported, voices, voiceName, chooseVoice, speakingId, speak, stop };
}
