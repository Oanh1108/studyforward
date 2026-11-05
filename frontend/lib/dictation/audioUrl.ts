/**
 * Where the TOEIC recordings are served from. The recordings are not in git (they are copyrighted and large), so on a
 * deployed site they live in separate storage: set NEXT_PUBLIC_AUDIO_BASE_URL to that storage's address
 * (e.g. https://xxxx.public.blob.vercel-storage.com) and a path such as /audio/toeic/2024/test-01/part-1.mp3 is
 * fetched from <base>/audio/toeic/2024/test-01/part-1.mp3. Unset, the path stays as it is and is served by the app itself
 * from public/, which is what local development uses.
 */
const configuredBase = (process.env.NEXT_PUBLIC_AUDIO_BASE_URL ?? '').trim().replace(/\/+$/, '');

export function audioUrl(path: string, base: string = configuredBase): string {
  if (!base || /^https?:\/\//i.test(path)) return path;
  return `${base}${path.startsWith('/') ? '' : '/'}${path}`;
}
