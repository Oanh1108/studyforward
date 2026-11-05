import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  YoutubeTranscript,
  YoutubeTranscriptDisabledError,
  YoutubeTranscriptTooManyRequestError,
} from 'youtube-transcript';
import { MediaService } from './media.service.js';

vi.mock('youtube-transcript', async (importOriginal) => {
  const actual = await importOriginal<typeof import('youtube-transcript')>();
  return { ...actual, YoutubeTranscript: { fetchTranscript: vi.fn() } };
});

const service = () => new MediaService({} as never);
const direct = vi.mocked(YoutubeTranscript.fetchTranscript);

describe('MediaService.fetchTranscript', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    direct.mockReset();
    delete process.env.SUPADATA_API_KEY;
  });
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    delete process.env.SUPADATA_API_KEY;
  });

  it('uses YouTube directly when it answers', async () => {
    direct.mockResolvedValue([{ text: 'Hello there.', offset: 1000, duration: 2000, lang: 'en' }]);
    const result = await service().fetchTranscript('abc');
    expect(result.segments).toEqual([{ startTime: 1, endTime: 3, text: 'Hello there.' }]);
  });

  it('answers BLOCKED when YouTube refuses the server and no fallback is configured', async () => {
    direct.mockRejectedValue(new YoutubeTranscriptTooManyRequestError());
    await expect(service().fetchTranscript('abc')).rejects.toMatchObject({ response: { code: 'BLOCKED' } });
  });

  it('asks the transcript service when YouTube refuses the server and a key is configured', async () => {
    process.env.SUPADATA_API_KEY = 'key';
    direct.mockRejectedValue(new YoutubeTranscriptTooManyRequestError());
    const fetchMock = vi.fn().mockResolvedValue({ status: 200, ok: true, json: async () => ({ content: [{ text: 'From the service.', offset: 0, duration: 1500 }] }) });
    vi.stubGlobal('fetch', fetchMock);
    const result = await service().fetchTranscript('abc');
    expect(result.segments).toEqual([{ startTime: 0, endTime: 1.5, text: 'From the service.' }]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('does not spend a fallback request on a video that has no captions', async () => {
    process.env.SUPADATA_API_KEY = 'key';
    direct.mockRejectedValue(new YoutubeTranscriptDisabledError('abc'));
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    await expect(service().fetchTranscript('abc')).rejects.toMatchObject({ response: { code: 'NO_CAPTIONS' } });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('keeps the original answer when the fallback fails too', async () => {
    process.env.SUPADATA_API_KEY = 'key';
    direct.mockRejectedValue(new YoutubeTranscriptTooManyRequestError());
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ status: 500, ok: false, json: async () => ({}) }));
    await expect(service().fetchTranscript('abc')).rejects.toMatchObject({ response: { code: 'BLOCKED' } });
  });
});
