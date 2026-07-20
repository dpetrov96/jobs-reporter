import { useCallback, useEffect, useRef, useState } from "react";
import {
  fetchRun,
  fetchRuns,
  formatCountdown,
  getMsUntilNextScheduledFetchForRegion,
  isHourlyRun,
  isJobRunRecord,
  isNearCronSlotForRegion,
} from "@jobs-reporter/shared";
import type { JobRunRecord, ScrapeRegionId } from "@jobs-reporter/shared";

const NORMAL_POLL_MS = 30_000;
const FAST_POLL_MS = 12_000;

export function useLiveRunWatch({
  apiUrl,
  scrapeRegion = "europe",
  knownFetchedAt,
  enabled = true,
  onNewRun,
}: {
  apiUrl: string;
  scrapeRegion?: ScrapeRegionId;
  knownFetchedAt?: string;
  enabled?: boolean;
  onNewRun: (run: JobRunRecord, previousFetchedAt?: string) => void;
}) {
  const knownFetchedAtRef = useRef(knownFetchedAt);
  const [countdownMs, setCountdownMs] = useState(() =>
    getMsUntilNextScheduledFetchForRegion(scrapeRegion)
  );
  const [nearCronSlot, setNearCronSlot] = useState(() =>
    isNearCronSlotForRegion(scrapeRegion)
  );
  const [newRunFlash, setNewRunFlash] = useState<{
    totalJobs: number;
    previousTotalJobs?: number;
  } | null>(null);

  knownFetchedAtRef.current = knownFetchedAt;

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setCountdownMs(getMsUntilNextScheduledFetchForRegion(scrapeRegion, now));
      setNearCronSlot(isNearCronSlotForRegion(scrapeRegion, now));
    };

    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [scrapeRegion]);

  const checkForNewRun = useCallback(async () => {
    const response = await fetchRuns(apiUrl, {
      limit: 5,
      scrapeRegion,
      reportKind: "hourly",
    });
    const meta = response.runs?.find((item) => isJobRunRecord(item) && isHourlyRun(item));
    if (!meta) return;

    const previousFetchedAt = knownFetchedAtRef.current;
    if (previousFetchedAt && meta.fetchedAt !== previousFetchedAt) {
      const detail = await fetchRun(apiUrl, meta.fetchedAt);
      const run = detail.run && isJobRunRecord(detail.run) ? detail.run : meta;
      knownFetchedAtRef.current = run.fetchedAt;
      onNewRun(run, previousFetchedAt);
      setNewRunFlash({
        totalJobs: run.totalJobs,
      });
      window.setTimeout(() => setNewRunFlash(null), 10_000);
    } else if (!previousFetchedAt) {
      knownFetchedAtRef.current = meta.fetchedAt;
    }
  }, [apiUrl, onNewRun, scrapeRegion]);

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
