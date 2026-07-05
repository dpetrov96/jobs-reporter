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
      <main className="mx-auto max-w-3xl px-3 py-3 sm:px-6 sm:py-5 lg:max-w-4xl">
        <div className="flex items-center gap-3 py-8 text-sm text-zinc-400">
          <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-zinc-300 border-t-transparent" />
          Loading…
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="mx-auto max-w-3xl px-3 py-3 sm:px-6 sm:py-5 lg:max-w-4xl">
        <div className="py-4 text-sm text-red-600">{error}</div>
      </main>
    );
  }

  if (!run) {
    return (
      <main className="mx-auto max-w-3xl px-3 py-3 sm:px-6 sm:py-5 lg:max-w-4xl">
        <div className="py-12 text-center text-sm text-zinc-400">Run not found.</div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-3 py-3 sm:px-6 sm:py-5 lg:max-w-4xl">
      <Link
        to="/"
        className="mb-4 inline-block text-xs text-zinc-400 transition hover:text-zinc-600"
      >
        ← Back
      </Link>
      <RunReport run={run} />
    </main>
  );
}
