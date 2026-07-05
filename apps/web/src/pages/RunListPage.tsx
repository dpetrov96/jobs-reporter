import { useCallback, useEffect, useState } from "react";
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
  const [error, setError] = useState<string | null>(null);

  const loadLatest = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetchRuns(apiUrl, { limit: 1 });
      setLatestRun(response.runs[0] ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load latest run");
      setLatestRun(null);
    } finally {
      setLoading(false);
    }
  }, [apiUrl]);

  useEffect(() => {
    void loadLatest();
  }, [loadLatest]);

  function handleRefreshed() {
    window.setTimeout(() => void loadLatest(), 5000);
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
        <RunReport run={latestRun} apiUrl={apiUrl} onRefreshed={handleRefreshed} />
      )}
    </main>
  );
}
