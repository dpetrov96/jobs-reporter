import { useCallback, useEffect, useRef, useState } from "react";
import {
  fetchRuns,
  formatCountdown,
  getMsUntilNextScheduledFetch,
  isJobRunRecord,
  isNearCronSlot,
} from "@jobs-reporter/shared";
import type { JobRunRecord } from "@jobs-reporter/shared";

const NORMAL_POLL_MS = 30_000;
const FAST_POLL_MS = 12_000;

export function useLiveRunWatch({
  apiUrl,
  knownFetchedAt,
  enabled = true,
  onNewRun,
}: {
  apiUrl: string;
  knownFetchedAt?: string;
  enabled?: boolean;
  onNewRun: (run: JobRunRecord, previousFetchedAt?: string) => void;
}) {
  const knownFetchedAtRef = useRef(knownFetchedAt);
  const [countdownMs, setCountdownMs] = useState(() => getMsUntilNextScheduledFetch());
  const [nearCronSlot, setNearCronSlot] = useState(() => isNearCronSlot());
  const [newRunFlash, setNewRunFlash] = useState<{
    totalJobs: number;
    previousTotalJobs?: number;
  } | null>(null);

  knownFetchedAtRef.current = knownFetchedAt;

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setCountdownMs(getMsUntilNextScheduledFetch(now));
      setNearCronSlot(isNearCronSlot(now));
    };

    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, []);

  const checkForNewRun = useCallback(async () => {
    const response = await fetchRuns(apiUrl, { limit: 3 });
    const run = response.runs?.find(isJobRunRecord);
    if (!run) return;

    const previousFetchedAt = knownFetchedAtRef.current;
    if (previousFetchedAt && run.fetchedAt !== previousFetchedAt) {
      knownFetchedAtRef.current = run.fetchedAt;
      onNewRun(run, previousFetchedAt);
      setNewRunFlash({
        totalJobs: run.totalJobs,
      });
      window.setTimeout(() => setNewRunFlash(null), 10_000);
    } else if (!previousFetchedAt) {
      knownFetchedAtRef.current = run.fetchedAt;
    }
  }, [apiUrl, onNewRun]);

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;

    const poll = async () => {
      if (cancelled || document.hidden) return;

      try {
        await checkForNewRun();
      } catch {
        // Ignore transient API errors while watching live.
      }
    };

    void poll();

    const intervalMs = nearCronSlot ? FAST_POLL_MS : NORMAL_POLL_MS;
    const timer = window.setInterval(() => void poll(), intervalMs);

    const onVisibility = () => {
      if (!document.hidden) void poll();
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [checkForNewRun, enabled, nearCronSlot]);

  return {
    countdownLabel: formatCountdown(countdownMs),
    nearCronSlot,
    newRunFlash,
    dismissFlash: () => setNewRunFlash(null),
  };
}
