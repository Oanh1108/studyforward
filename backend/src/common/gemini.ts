/**
 * Calls Gemini's generateContent, moving on to another model when the first one is overloaded or retired.
 * Same shape as fetch(url, init) minus the URL: pass the API key and the request init (method, headers, body).
 */
const MODELS = Array.from(
  new Set([process.env.GEMINI_MODEL, 'gemini-flash-latest', 'gemini-flash-lite-latest', 'gemini-3.7-flash'].filter(Boolean) as string[]),
);
const RETRY_SAME_MODEL = new Set([429, 503]);
const NEXT_MODEL = new Set([404, 500, 502, 504]);
const TIMEOUT_MS = 15000;
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function geminiFetch(apiKey: string, init: RequestInit): Promise<Response> {
  let lastResponse: Response | undefined;
  let lastError: unknown;

  for (const model of MODELS) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey.trim()}`;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const res = await fetch(url, { ...init, signal: AbortSignal.timeout(TIMEOUT_MS) });
        if (res.ok || !(RETRY_SAME_MODEL.has(res.status) || NEXT_MODEL.has(res.status))) return res;
        lastResponse = res;
        if (!RETRY_SAME_MODEL.has(res.status)) break; // retired or failing: try the next model
        await sleep(500);
      } catch (err) {
        lastError = err;
        break;
      }
    }
  }
  if (lastResponse) return lastResponse;
  throw lastError ?? new Error('Gemini request failed');
}
