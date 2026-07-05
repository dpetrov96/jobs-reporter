import { useCallback, useEffect, useRef, useState } from "react";
import { fetchRuns } from "@jobs-reporter/shared";
import type { JobRunRecord } from "@jobs-reporter/shared";
import { RunReport } from "../components/RunReport";

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
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollTimerRef = useRef<number | null>(null);
  const latestRunRef = useRef(latestRun);

  latestRunRef.current = latestRun;

  const loadLatest = useCallback(
    async (options?: { background?: boolean }) => {
      if (!options?.background) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }
      setError(null);

      try {
        const response = await fetchRuns(apiUrl, { limit: 1 });
        setLatestRun(response.runs?.[0] ?? null);
      } catch (err) {
        if (!options?.background) {
          setError(err instanceof Error ? err.message : "Failed to load latest run");
          setLatestRun(null);
        }
      } finally {
        if (!options?.background) {
          setLoading(false);
        } else {
          setRefreshing(false);
        }
      }
    },
    [apiUrl]
  );

  useEffect(() => {
    void loadLatest();
  }, [loadLatest]);

  useEffect(() => {
    return () => {
      if (pollTimerRef.current != null) {
        window.clearTimeout(pollTimerRef.current);
      }
    };
  }, []);

  function handleRefreshed() {
    const previousFetchedAt = latestRunRef.current?.fetchedAt;
    let attempts = 0;

    const poll = async () => {
      attempts += 1;

      try {
        const response = await fetchRuns(apiUrl, { limit: 1 });
        const run = response.runs?.[0];

        if (run && run.fetchedAt !== previousFetchedAt) {
          setLatestRun(run);
          setRefreshing(false);
          return;
        }
      } catch {
        // Keep polling — fetch may still be running on the backend.
      }

      if (attempts < 24) {
        pollTimerRef.current = window.setTimeout(() => void poll(), 5000);
        return;
      }

      setRefreshing(false);
      void loadLatest({ background: true });
    };

    setRefreshing(true);
    pollTimerRef.current = window.setTimeout(() => void poll(), 5000);
  }

  if (loading) {
    return (
      <main className="mx-auto max-w-3xl px-3 py-3 sm:px-6 sm:py-5 lg:max-w-4xl">
        <LoadingState label="Loading…" />
      </main>
    );
  }

  if (error && !latestRun) {
    return (
      <main className="mx-auto max-w-3xl px-3 py-3 sm:px-6 sm:py-5 lg:max-w-4xl">
        <ErrorState message={error} />
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-3 py-3 sm:px-6 sm:py-5 lg:max-w-4xl">
      {!latestRun ? (
        <div className="py-12 text-center text-sm text-zinc-400">No jobs loaded yet.</div>
      ) : (
        <>
          {refreshing ? (
            <p className="mb-2 text-xs text-zinc-400">Updating jobs in the background…</p>
          ) : null}
          <RunReport run={latestRun} apiUrl={apiUrl} onRefreshed={handleRefreshed} />
        </>
      )}
    </main>
  );
}
