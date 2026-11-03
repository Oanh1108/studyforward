"use client";

import { useCallback, useEffect, useState } from 'react';
import { loadProgress, mergeProgress, recordAttempt, saveProgress, type ProgressMap } from '@/lib/dictation/progress';
import { canSyncDictation, dictationProgressApi } from '@/lib/dictationProgressApi';

/**
 * Practice results. They are kept in this browser right away and, for a signed-in user, also saved to the account,
 * so they follow the user to other browsers. Starts empty on the server and fills in once mounted.
 */
export function usePracticeProgress() {
  const [progress, setProgress] = useState<ProgressMap>({});

  useEffect(() => {
    const local = loadProgress(window.localStorage);
    setProgress(local);
    if (!canSyncDictation()) return;

    // Send what this browser already has (the server keeps the best of both), then show the combined result.
    let cancelled = false;
    const upload = Object.keys(local).length ? dictationProgressApi.importMany(local) : dictationProgressApi.getMine();
    upload
      .then((remote) => {
        if (cancelled) return;
        setProgress((current) => {
          const merged = mergeProgress(current, remote);
          saveProgress(window.localStorage, merged);
          return merged;
        });
      })
      .catch(() => {
        /* offline or signed out: the local copy keeps working */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const record = useCallback((itemId: string, score: number) => {
    setProgress((prev) => {
      const next = recordAttempt(prev, itemId, score, Date.now());
      saveProgress(window.localStorage, next);
      return next;
    });
    if (canSyncDictation()) dictationProgressApi.record(itemId, score).catch(() => {});
  }, []);

  return { progress, record };
}
