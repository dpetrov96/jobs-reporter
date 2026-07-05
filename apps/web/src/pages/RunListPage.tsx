import { useCallback, useEffect, useRef, useState } from "react";
import { fetchRuns, isJobRunRecord } from "@jobs-reporter/shared";
import type { JobRunRecord } from "@jobs-reporter/shared";
import { RunNowButton } from "../components/RunNowButton";
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

export function RunListPage({ apiUrl }: { apiUrl: string }) {
  const [latestRun, setLatestRun] = useState<JobRunRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollTimerRef = useRef<number | null>(null);
  const latestRunRef = useRef(latestRun);

  latestRunRef.current = latestRun;

  const clearPollTimer = useCallback(() => {
    if (pollTimerRef.current != null) {
      window.clearTimeout(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }, []);

  const stopScanning = useCallback(() => {
    clearPollTimer();
    setIsScanning(false);
  }, [clearPollTimer]);

  const loadLatest = useCallback(
    async (options?: { background?: boolean }) => {
      if (!options?.background) {
        setLoading(true);
      }
      setError(null);

      try {
        const response = await fetchRuns(apiUrl, { limit: 5 });
        const run = response.runs?.find(isJobRunRecord) ?? null;
        setLatestRun(run);
      } catch (err) {
        if (!options?.background) {
          setError(err instanceof Error ? err.message : "Failed to load latest run");
          setLatestRun(null);
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
    void loadLatest();
  }, [loadLatest]);

  useEffect(() => {
    return () => clearPollTimer();
  }, [clearPollTimer]);

  const startPolling = useCallback(() => {
    clearPollTimer();
    const previousFetchedAt = latestRunRef.current?.fetchedAt;
    let attempts = 0;

    const poll = async () => {
      attempts += 1;

      try {
        const response = await fetchRuns(apiUrl, { limit: 5 });
        const run = response.runs?.find(
          (item) => isJobRunRecord(item) && item.fetchedAt !== previousFetchedAt
        );

        if (run) {
          setLatestRun(run);
          stopScanning();
          return;
        }
      } catch {
        // Fetch may still be running on the backend.
      }

      if (attempts < 24) {
        pollTimerRef.current = window.setTimeout(() => void poll(), 5000);
        return;
      }

      stopScanning();
      void loadLatest({ background: true });
    };

    pollTimerRef.current = window.setTimeout(() => void poll(), 5000);
  }, [apiUrl, clearPollTimer, loadLatest, stopScanning]);

  const handleScanStart = useCallback(() => {
    setIsScanning(true);
  }, []);

  const handleScanTriggered = useCallback(() => {
    setIsScanning(true);
    startPolling();
  }, [startPolling]);

  if (loading) {
    return (
      <main className="mx-auto max-w-3xl px-3 py-3 sm:px-6 sm:py-5 lg:max-w-4xl">
        <LoadingState label="Loading…" />
      </main>
    );
  }

  if (error && !latestRun && !isScanning) {
    return (
      <main className="mx-auto max-w-3xl px-3 py-3 sm:px-6 sm:py-5 lg:max-w-4xl">
        <ErrorState message={error} />
      </main>
    );
  }

  if (!latestRun) {
    return (
      <main className="mx-auto max-w-3xl px-3 py-3 sm:px-6 sm:py-5 lg:max-w-4xl">
        <div className="space-y-3">
          <header className="flex items-center justify-between gap-3 rounded-lg bg-zinc-50 px-2.5 py-2 ring-1 ring-zinc-200/70 sm:px-3">
            <p className="text-xs font-medium text-zinc-600">
              {isScanning ? "Checking job market…" : "No data yet"}
            </p>
            <RunNowButton
              apiUrl={apiUrl}
              compact
              onScanStart={handleScanStart}
              onTriggered={handleScanTriggered}
              onScanEnd={stopScanning}
            />
          </header>
          {isScanning ? (
            <ScanStatusBanner message="Scanning LinkedIn across countries — this may take a few minutes." />
          ) : (
            <p className="py-8 text-center text-sm text-zinc-400">
              No jobs loaded yet. Hit Refresh to run a scan.
            </p>
          )}
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-3 py-3 sm:px-6 sm:py-5 lg:max-w-4xl">
      <RunReport
        run={latestRun}
        apiUrl={apiUrl}
        isScanning={isScanning}
        onScanStart={handleScanStart}
        onScanTriggered={handleScanTriggered}
        onScanEnd={stopScanning}
      />
    </main>
  );
}
