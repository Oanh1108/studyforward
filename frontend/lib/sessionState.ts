import { useEffect, useState, type Dispatch, type SetStateAction } from 'react';

/**
 * Keeps "where the user is" across a page reload: stored per browser tab (sessionStorage), so a reload brings the
 * page back as it was, while a new tab or a later visit starts fresh.
 */
export function readSession(key: string): unknown {
  try {
    const raw = window.sessionStorage.getItem(key);
    return raw === null ? undefined : JSON.parse(raw);
  } catch {
    return undefined;
  }
}

export function writeSession(key: string, value: unknown): void {
  try {
    if (value === undefined) window.sessionStorage.removeItem(key);
    else window.sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage full or blocked: the page just will not be restored */
  }
}

export function clearSession(key: string): void {
  writeSession(key, undefined);
}

/**
 * useState that is saved to sessionStorage and restored after a reload. Nothing is read on the server or during the
 * first render (so there is no hydration mismatch); `restored` turns true once the saved value, if any, has been applied.
 * `sanitize` decides whether a saved value is still usable and may repair it; returning undefined discards it.
 */
export function useSessionState<T>(
  key: string,
  initial: T,
  sanitize: (raw: unknown) => T | undefined,
): readonly [T, Dispatch<SetStateAction<T>>, boolean] {
  const [value, setValue] = useState<T>(initial);
  const [restored, setRestored] = useState(false);

  useEffect(() => {
    const saved = sanitize(readSession(key));
    if (saved !== undefined) setValue(saved);
    setRestored(true);
    // sanitize is expected to be a stable function; only the key decides when to restore
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useEffect(() => {
    if (restored) writeSession(key, value);
  }, [key, value, restored]);

  return [value, setValue, restored] as const;
}
