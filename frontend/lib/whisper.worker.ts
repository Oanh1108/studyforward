/* On-device speech-to-text (Whisper) running in a Web Worker so the UI never freezes. */
import { pipeline, env } from '@huggingface/transformers';

env.allowLocalModels = false;

// whisper-tiny misheard quiet or muffled speech; base is the smallest model that reads it reliably.
const MODEL = 'onnx-community/whisper-base';
const ctx: any = self;

let recognizer: Promise<any> | null = null;

const load = () => {
  if (!recognizer) {
    recognizer = pipeline('automatic-speech-recognition', MODEL, {
      device: 'wasm',
      dtype: 'q8',
      progress_callback: (p: any) => {
        if (p?.status === 'progress' && typeof p.progress === 'number') {
          ctx.postMessage({ type: 'progress', progress: p.progress });
        }
      },
    }).catch((err) => {
      recognizer = null; // allow a retry
      throw err;
    });
  }
  return recognizer;
};

ctx.onmessage = async (event: MessageEvent) => {
  const { type, id, audio, language } = event.data;
  try {
    if (type === 'load') {
      await load();
      ctx.postMessage({ type: 'ready' });
    } else if (type === 'transcribe') {
      const asr = await load();
      const out = await asr(audio, { language, task: 'transcribe' });
      ctx.postMessage({ type: 'result', id, text: Array.isArray(out) ? out.map((o: any) => o.text).join(' ') : out.text });
    }
  } catch (err: any) {
    ctx.postMessage({ type: 'error', id, message: err?.message || String(err) });
  }
};
