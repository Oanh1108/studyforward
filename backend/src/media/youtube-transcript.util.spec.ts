import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchViaSupadata, groupIntoSegments } from './youtube-transcript.util.js';

const json = (status: number, body: unknown) => ({ status, ok: status >= 200 && status < 300, json: async () => body }) as Response;

describe('groupIntoSegments', () => {
  it('ends a segment at sentence punctuation and converts milliseconds to seconds', () => {
    const segments = groupIntoSegments([
      { text: 'Hello', offset: 1000, duration: 1000 },
      { text: 'there.', offset: 2000, duration: 1000 },
      { text: 'How are you', offset: 4000, duration: 1000 },
    ]);
    expect(segments).toEqual([
      { startTime: 1, endTime: 3, text: 'Hello there.' },
      { startTime: 4, endTime: 5, text: 'How are you' },
    ]);
  });

  it('cuts a segment that runs past five seconds even without punctuation', () => {
    const segments = groupIntoSegments([
      { text: 'a', offset: 0, duration: 3000 },
      { text: 'b', offset: 3000, duration: 3000 },
      { text: 'c', offset: 6000, duration: 1000 },
    ]);
    expect(segments.map((s) => s.text)).toEqual(['a b', 'c']);
  });
});

describe('fetchViaSupadata', () => {
  afterEach(() => vi.useRealTimers());

  it('asks for the existing captions with the API key and returns the pieces', async () => {
    const fetchFn = vi.fn().mockResolvedValue(json(200, { content: [{ text: 'Hi', offset: 500, duration: 900, lang: 'en' }, { text: '  ', offset: 1, duration: 1 }] }));
    const items = await fetchViaSupadata('LGqxqxDysO4', 'key-123', fetchFn as unknown as typeof fetch);
    expect(items).toEqual([{ text: 'Hi', offset: 500, duration: 900 }]);
    const [url, init] = fetchFn.mock.calls[0];
    expect(String(url)).toContain('mode=native');
    expect(decodeURIComponent(String(url))).toContain('v=LGqxqxDysO4');
    expect(init.headers['x-api-key']).toBe('key-123');
  });

  it('returns null when the video has no captions (206) or the transcript is empty', async () => {
    expect(await fetchViaSupadata('x', 'k', vi.fn().mockResolvedValue(json(206, {})) as unknown as typeof fetch)).toBeNull();
    expect(await fetchViaSupadata('x', 'k', vi.fn().mockResolvedValue(json(200, { content: [] })) as unknown as typeof fetch)).toBeNull();
  });

  it('throws when the service refuses the request', async () => {
    await expect(fetchViaSupadata('x', 'k', vi.fn().mockResolvedValue(json(403, {})) as unknown as typeof fetch)).rejects.toThrow('403');
  });

  it('polls a job until it completes', async () => {
    vi.useFakeTimers();
    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce(json(202, { jobId: 'job-1' }))
      .mockResolvedValueOnce(json(200, { status: 'active' }))
      .mockResolvedValueOnce(json(200, { status: 'completed', content: [{ text: 'Done.', offset: 0, duration: 2000 }] }));
    const pending = fetchViaSupadata('x', 'k', fetchFn as unknown as typeof fetch);
    await vi.runAllTimersAsync();
    expect(await pending).toEqual([{ text: 'Done.', offset: 0, duration: 2000 }]);
    expect(String(fetchFn.mock.calls[1][0])).toContain('/job-1');
  });
});
