/** One piece of captions as YouTube cuts them. Times are in milliseconds. */
export interface RawTranscriptItem {
  text: string;
  offset: number;
  duration: number;
}

export interface TranscriptSegment {
  startTime: number;
  endTime: number;
  text: string;
}

/** Joins YouTube's short caption pieces into sentence-like practice segments (seconds). */
export function groupIntoSegments(items: RawTranscriptItem[]): TranscriptSegment[] {
  const segments: TranscriptSegment[] = [];
  let current: TranscriptSegment = { startTime: 0, endTime: 0, text: '' };

  for (const item of items) {
    if (!current.text) {
      current.startTime = item.offset / 1000;
      current.text = item.text;
    } else {
      current.text += ' ' + item.text;
    }
    current.endTime = (item.offset + item.duration) / 1000;

    // A segment ends after 5 seconds or at sentence-ending punctuation
    const duration = current.endTime - current.startTime;
    if (duration > 5 || /[.!?]$/.test(current.text)) {
      segments.push({ ...current });
      current = { startTime: 0, endTime: 0, text: '' };
    }
  }
  if (current.text) segments.push(current);
  return segments;
}

const SUPADATA_URL = 'https://api.supadata.ai/v1/transcript';
const POLL_MS = 1000;
const POLL_LIMIT = 20;

type FetchFn = typeof fetch;

/**
 * Fallback for when YouTube refuses our server's address: asks Supadata (a transcript API whose requests come from
 * elsewhere) for the video's existing captions ("native" mode, which does not generate speech-to-text).
 * Returns null when the video has no captions there either.
 */
export async function fetchViaSupadata(videoId: string, apiKey: string, fetchFn: FetchFn = fetch): Promise<RawTranscriptItem[] | null> {
  const query = new URLSearchParams({ url: `https://www.youtube.com/watch?v=${videoId}`, lang: 'en', text: 'false', mode: 'native' });
  const headers = { 'x-api-key': apiKey };

  let res = await fetchFn(`${SUPADATA_URL}?${query}`, { headers });
  if (res.status === 206) return null; // no captions available
  if (!res.ok && res.status !== 202) throw new Error(`Supadata answered ${res.status}`);

  let body: any = await res.json();
  // Long videos are processed as a job: poll until it finishes
  if (res.status === 202 && body?.jobId) {
    for (let i = 0; i < POLL_LIMIT; i++) {
      await new Promise((resolve) => setTimeout(resolve, POLL_MS));
      res = await fetchFn(`${SUPADATA_URL}/${encodeURIComponent(body.jobId)}`, { headers });
      if (!res.ok) throw new Error(`Supadata job answered ${res.status}`);
      body = await res.json();
      if (body?.status === 'failed') throw new Error('Supadata job failed');
      if (body?.status === 'completed') break;
    }
    if (body?.status !== 'completed') throw new Error('Supadata job did not finish in time');
  }

  const content = body?.content;
  if (!Array.isArray(content) || content.length === 0) return null;
  return content
    .filter((c: any) => c && typeof c.text === 'string' && c.text.trim())
    .map((c: any) => ({ text: c.text, offset: Number(c.offset) || 0, duration: Number(c.duration) || 0 }));
}
