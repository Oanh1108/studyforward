const CACHE_KEY = 'sf-dictation-vi-v1';
const ENDPOINT = 'https://api.mymemory.translated.net/get';

const memory = new Map<string, string>();
const inflight = new Map<string, Promise<string>>();
let loaded = false;

function load() {
  if (loaded || typeof window === 'undefined') return;
  loaded = true;
  try {
    const saved = JSON.parse(window.localStorage.getItem(CACHE_KEY) || '{}') as Record<string, string>;
    Object.entries(saved).forEach(([k, v]) => memory.set(k, v));
  } catch {
    /* an unreadable cache is just an empty one */
  }
}

function persist() {
  try {
    window.localStorage.setItem(CACHE_KEY, JSON.stringify(Object.fromEntries(memory)));
  } catch {
    /* storage full or blocked: translations still work, they just are not remembered */
  }
}

/** Translates one English sentence into Vietnamese. Results are remembered in this browser. */
export function translateToVietnamese(text: string): Promise<string> {
  load();
  const key = text.trim();
  const cached = memory.get(key);
  if (cached) return Promise.resolve(cached);
  const pending = inflight.get(key);
  if (pending) return pending;

  const request = fetch(`${ENDPOINT}?q=${encodeURIComponent(key)}&langpair=en|vi`)
    .then((res) => {
      if (!res.ok) throw new Error(`translate failed: ${res.status}`);
      return res.json() as Promise<{ responseStatus?: number | string; responseData?: { translatedText?: string } }>;
    })
    .then((data) => {
      const out = data.responseData?.translatedText?.trim();
      // The service reports quota problems as ordinary text, so reject those instead of showing them.
      if (Number(data.responseStatus) !== 200 || !out || /MYMEMORY WARNING|INVALID/i.test(out)) {
        throw new Error('translate failed');
      }
      memory.set(key, out);
      persist();
      return out;
    })
    .finally(() => inflight.delete(key));

  inflight.set(key, request);
  return request;
}
