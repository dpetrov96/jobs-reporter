import { useCallback, useEffect, useRef, useState } from "react";
import {
  fetchRun,
  fetchRuns,
  getScrapeRegion,
  isHourlyRun,
  isJobRunRecord,
} from "@jobs-reporter/shared";
import type { JobRunRecord, ScrapeRegionId } from "@jobs-reporter/shared";
import { useLiveRunWatch } from "../hooks/useLiveRunWatch";
import { useScrapeRegion } from "../hooks/useScrapeRegion";
import { RegionMarketPanel } from "../components/RegionMarketPanel";
import { RunReport } from "../components/RunReport";
import { ScanStatusBanner } from "../components/ScanStatusBanner";

function LoadingState({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 py-8 text-sm text-zinc-400">
      <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-zinc-300 border-t-transparent" />
      {label}
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return <div className="py-4 text-sm text-red-600">{message}</div>;
}

function pickLatestHourlyMeta(runs: JobRunRecord[]): JobRunRecord | null {
  return runs.find((run) => isJobRunRecord(run) && isHourlyRun(run)) ?? null;
}

async function fetchLatestFullRun(
  apiUrl: string,
  scrapeRegion: ScrapeRegionId
): Promise<JobRunRecord | null> {
  const list = await fetchRuns(apiUrl, { limit: 5, scrapeRegion, reportKind: "hourly" });
  const meta = pickLatestHourlyMeta(list.runs);
  if (!meta) return null;

  const detail = await fetchRun(apiUrl, meta.fetchedAt);
  const run = detail.run;
  return run && isJobRunRecord(run) ? run : meta;
}

const EMPTY_RUNS: Record<ScrapeRegionId, JobRunRecord | null> = {
  europe: null,
  usa: null,
};

export function RunListPage({ apiUrl }: { apiUrl: string }) {
  const { region, setRegion } = useScrapeRegion();
  const [runsByRegion, setRunsByRegion] =
    useState<Record<ScrapeRegionId, JobRunRecord | null>>(EMPTY_RUNS);
  const [loading, setLoading] = useState(true);
  const [scanningRegion, setScanningRegion] = useState<ScrapeRegionId | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pollTimerRef = useRef<number | null>(null);
  const runsByRegionRef = useRef(runsByRegion);

  runsByRegionRef.current = runsByRegion;
  const latestRun = runsByRegion[region];

  const clearPollTimer = useCallback(() => {
    if (pollTimerRef.current != null) {
      window.clearTimeout(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }, []);

  const stopScanning = useCallback(
    (targetRegion?: ScrapeRegionId) => {
      clearPollTimer();
      setScanningRegion((current) => {
        if (!targetRegion || current === targetRegion) return null;
        return current;
      });
    },
    [clearPollTimer]
  );

  const loadAllRegions = useCallback(
    async (options?: { background?: boolean }) => {
      if (!options?.background) {
        setLoading(true);
      }
      setError(null);

      try {
        const [europe, usa] = await Promise.all([
          fetchLatestFullRun(apiUrl, "europe"),
          fetchLatestFullRun(apiUrl, "usa"),
        ]);

        setRunsByRegion({ europe, usa });
      } catch (err) {
        if (!options?.background) {
          setError(err instanceof Error ? err.message : "Failed to load latest runs");
          setRunsByRegion(EMPTY_RUNS);
        }
      } finally {
        if (!options?.background) {
          setLoading(false);
        }
      }
    },
    [apiUrl]
  );

  useEffect(() => {
    void loadAllRegions();
  }, [loadAllRegions]);

  useEffect(() => {
    return () => clearPollTimer();
  }, [clearPollTimer]);

  const startPolling = useCallback(
    (targetRegion: ScrapeRegionId) => {
      clearPollTimer();
      const previousFetchedAt = runsByRegionRef.current[targetRegion]?.fetchedAt;
      let attempts = 0;

      const poll = async () => {
        attempts += 1;

        try {
          const response = await fetchRuns(apiUrl, {
            limit: 5,
            scrapeRegion: targetRegion,
            reportKind: "hourly",
          });
          const meta = response.runs.find(
            (item) =>
              isJobRunRecord(item) &&
              isHourlyRun(item) &&
              item.fetchedAt !== previousFetchedAt
          );

          if (meta) {
            const detail = await fetchRun(apiUrl, meta.fetchedAt);
            const run =
              detail.run && isJobRunRecord(detail.run) ? detail.run : meta;
            setRunsByRegion((current) => ({ ...current, [targetRegion]: run }));
            stopScanning(targetRegion);
            return;
          }
        } catch {
          // Fetch may still be running on the backend.
        }

        if (attempts < 24) {
          pollTimerRef.current = window.setTimeout(() => void poll(), 5000);
          return;
        }

        stopScanning(targetRegion);
        void loadAllRegions({ background: true });
      };

      pollTimerRef.current = window.setTimeout(() => void poll(), 5000);
    },
    [apiUrl, clearPollTimer, loadAllRegions, stopScanning]
  );

  const handleScanStart = useCallback((targetRegion: ScrapeRegionId) => {
    setScanningRegion(targetRegion);
  }, []);

  const handleScanTriggered = useCallback(
    (targetRegion: ScrapeRegionId) => {
      setScanningRegion(targetRegion);
      startPolling(targetRegion);
    },
    [startPolling]
  );

  const handleLiveNewRun = useCallback((run: JobRunRecord, runRegion: ScrapeRegionId) => {
    if (!isHourlyRun(run)) return;
    setRunsByRegion((current) => ({ ...current, [runRegion]: run }));
    setError(null);
  }, []);

  const live = useLiveRunWatch({
    apiUrl,
    scrapeRegion: region,
    knownFetchedAt: latestRun?.fetchedAt,
    enabled: scanningRegion === null && !loading,
    onNewRun: (run) => handleLiveNewRun(run, region),
  });

  useEffect(() => {
    if (live.newRunFlash && live.newRunFlash.totalJobs > 0) {
      void loadAllRegions({ background: true });
    }
  }, [live.newRunFlash, loadAllRegions]);

  const regionConfig = getScrapeRegion(region);

  return (
    <main className="mx-auto max-w-3xl px-3 py-3 sm:px-6 sm:py-5 lg:max-w-4xl">
      <div className="space-y-4">
        <RegionMarketPanel
          apiUrl={apiUrl}
          activeRegion={region}
          runsByRegion={runsByRegion}
          scanningRegion={scanningRegion}
          onRegionChange={setRegion}
          onScanStart={handleScanStart}
          onScanTriggered={handleScanTriggered}
          onScanEnd={stopScanning}
        />

        {loading ? (
          <LoadingState label="Loading job listings…" />
        ) : error && !latestRun && scanningRegion !== region ? (
          <ErrorState message={error} />
        ) : scanningRegion === region ? (
          <ScanStatusBanner message={`Scanning LinkedIn in ${regionConfig.label} — this may take a few minutes.`} />
        ) : !latestRun ? (
          <p className="py-8 text-center text-sm text-zinc-400">
            No jobs loaded yet for {regionConfig.label}. Use Refresh above or wait for the next
            auto-scan.
          </p>
        ) : (
          <RunReport run={latestRun} isScanning={scanningRegion === region} />
        )}
      </div>
    </main>
  );
}
