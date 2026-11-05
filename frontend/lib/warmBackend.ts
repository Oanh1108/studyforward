/**
 * The backend runs on a plan that puts it to sleep after a while without requests, and waking it takes up to a minute.
 * Sending it a request as soon as the login or register page opens means it is awake by the time the user clicks
 * "Sign in with Google", which goes straight to the backend. The answer does not matter, so it is not read.
 */
export function warmBackend(): void {
  if (typeof window === 'undefined') return;
  const fallback = process.env.NODE_ENV === 'production' ? 'https://studyforward.onrender.com' : 'http://localhost:3002';
  const baseUrl = (process.env.NEXT_PUBLIC_API_URL || fallback).replace(/\/+$/, '');
  fetch(`${baseUrl}/api`, { mode: 'no-cors', cache: 'no-store' }).catch(() => {});
}
