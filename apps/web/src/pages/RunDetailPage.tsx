import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { fetchRun } from "@jobs-reporter/shared";
import type { JobRunRecord } from "@jobs-reporter/shared";
import { RunReport } from "../components/RunReport";

export function RunDetailPage({ apiUrl }: { apiUrl: string }) {
  const { fetchedAt = "" } = useParams();
  const [run, setRun] = useState<JobRunRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const decoded = decodeURIComponent(fetchedAt);
        const response = await fetchRun(apiUrl, decoded);
        if (!cancelled) setRun(response.run ?? null);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load run");
          setRun(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [apiUrl, fetchedAt]);

  if (loading) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
        <div className="flex items-center gap-3 rounded-2xl border border-zinc-200 bg-white px-4 py-6 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
          <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
          Loading report…
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </div>
      </main>
    );
  }

  if (!run) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
        <div className="rounded-2xl border border-dashed border-zinc-300 px-4 py-10 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
          Run not found.
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-5xl space-y-4 px-4 py-6 sm:px-6">
      <Link
        to="/"
        className="inline-flex items-center gap-1 text-sm font-medium text-emerald-600 transition hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300"
      >
        ← Latest report
      </Link>
      <RunReport run={run} />
    </main>
  );
}
