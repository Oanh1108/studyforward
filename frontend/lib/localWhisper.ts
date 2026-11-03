"use client";

import { AudioLevels, isSilentRecording, isWhisperHallucination, measureAudio, normalizeSamples } from './speechAudio';

/** Client for the on-device Whisper worker (see whisper.worker.ts). Browser only. */

/** The microphone delivered (almost) no signal; transcribing it would only produce made-up words. */
export class SilentRecordingError extends Error {
  constructor(public levels: AudioLevels) {
    super('Recording is silent');
  }
}

export type WhisperStatus = 'idle' | 'loading' | 'ready' | 'error';

const WHISPER_LANGUAGES: Record<string, string> = {
  en: 'english',
  ko: 'korean',
  ja: 'japanese',
  zh: 'chinese',
  th: 'thai',
};
const TARGET_SAMPLE_RATE = 16000;

let worker: Worker | null = null;
let status: WhisperStatus = 'idle';
let progress = 0;
let readyPromise: Promise<void> | null = null;
let nextId = 1;
const pending = new Map<number, { resolve: (text: string) => void; reject: (err: Error) => void }>();
const listeners = new Set<() => void>();

const notify = () => listeners.forEach((fn) => fn());

export function subscribeWhisper(fn: () => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export const getWhisperState = () => ({ status, progress });

function getWorker(): Worker {
  if (worker) return worker;
  worker = new Worker(new URL('./whisper.worker.ts', import.meta.url), { type: 'module' });
  worker.onmessage = (event: MessageEvent) => {
    const msg = event.data;
    if (msg.type === 'progress') {
      progress = msg.progress;
      notify();
    } else if (msg.type === 'result') {
      pending.get(msg.id)?.resolve(msg.text ?? '');
      pending.delete(msg.id);
    } else if (msg.type === 'error') {
      pending.get(msg.id)?.reject(new Error(msg.message));
      pending.delete(msg.id);
    }
  };
  return worker;
}

/** Starts downloading/initialising the model in the background (cached by the browser afterwards). */
export function preloadWhisper(): Promise<void> {
  if (readyPromise) return readyPromise;
  status = 'loading';
  notify();
  const w = getWorker();
  readyPromise = new Promise<void>((resolve, reject) => {
    const onMessage = (event: MessageEvent) => {
      if (event.data.type === 'ready') {
        w.removeEventListener('message', onMessage);
        status = 'ready';
        notify();
        resolve();
      } else if (event.data.type === 'error' && event.data.id === undefined) {
        w.removeEventListener('message', onMessage);
        status = 'error';
        readyPromise = null;
        notify();
        reject(new Error(event.data.message));
      }
    };
    w.addEventListener('message', onMessage);
    w.postMessage({ type: 'load' });
  });
  readyPromise.catch(() => {});
  return readyPromise;
}

/** Decodes a recorded blob to 16 kHz mono. */
async function blobToAudio(blob: Blob): Promise<Float32Array> {
  const ctx = new AudioContext();
  try {
    const decoded = await ctx.decodeAudioData(await blob.arrayBuffer());
    const length = Math.max(1, Math.ceil(decoded.duration * TARGET_SAMPLE_RATE));
    const offline = new OfflineAudioContext(1, length, TARGET_SAMPLE_RATE);
    const source = offline.createBufferSource();
    source.buffer = decoded;
    source.connect(offline.destination);
    source.start();
    return (await offline.startRendering()).getChannelData(0).slice();
  } finally {
    ctx.close().catch(() => {});
  }
}

export interface LocalTranscription {
  /** Empty when nothing intelligible was heard. */
  text: string;
  levels: AudioLevels;
}

export async function transcribeLocally(blob: Blob, language: string): Promise<LocalTranscription> {
  await preloadWhisper();
  const raw = await blobToAudio(blob);
  const levels = measureAudio(raw);
  if (isSilentRecording(levels)) throw new SilentRecordingError(levels);

  const audio = normalizeSamples(raw);
  const id = nextId++;
  const w = getWorker();
  const text = await new Promise<string>((resolve, reject) => {
    pending.set(id, { resolve, reject });
    w.postMessage({ type: 'transcribe', id, audio, language: WHISPER_LANGUAGES[language] ?? 'english' });
  });
  return { text: isWhisperHallucination(text) ? '' : text.trim(), levels };
}
