import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchRuns, isJobRunRecord } from "@jobs-reporter/shared";
import type { JobRunRecord } from "@jobs-reporter/shared";
import { RunHistoryPagination } from "../components/RunHistoryPagination";
import { RunHistoryRow } from "../components/RunHistoryRow";

const HISTORY_PAGE_SIZE = 10;

function LoadingState({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 py-8 text-sm text-zinc-400">
      <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-zinc-300 border-t-transparent" />
      {label}
    </div>
  );
}

export function RunHistoryPage({ apiUrl }: { apiUrl: string }) {
  const [runs, setRuns] = useState<JobRunRecord[]>([]);
  const [page, setPage] = useState(0);
  const [cursors, setCursors] = useState<string[]>([""]);
  const [nextCursor, setNextCursor] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadPage = useCallback(async () => {
    setLoading(true);
    setError(null);

    const cursor = cursors[page];

    try {
      const response = await fetchRuns(apiUrl, {
        limit: HISTORY_PAGE_SIZE,
        ...(cursor ? { cursor } : {}),
      });
      setRuns(response.runs.filter(isJobRunRecord));
      setNextCursor(response.nextCursor);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load run history");
      setRuns([]);
      setNextCursor(undefined);
    } finally {
      setLoading(false);
    }
  }, [apiUrl, cursors, page]);

  useEffect(() => {
    void loadPage();
  }, [loadPage]);

  function goToNextPage() {
    if (!nextCursor) return;

    setCursors((current) => {
      const next = [...current];
      next[page + 1] = nextCursor;
      return next;
    });
    setPage((current) => current + 1);
  }

  function goToPreviousPage() {
    setPage((current) => Math.max(0, current - 1));
  }

  return (
    <main className="mx-auto max-w-3xl px-3 py-3 sm:px-6 sm:py-5 lg:max-w-4xl">
      <header className="border-b border-zinc-200 pb-4">
        <Link to="/" className="text-xs text-zinc-400 transition hover:text-zinc-600">
          ← Latest report
        </Link>
        <h1 className="mt-2 text-lg font-semibold text-zinc-900 sm:text-xl">Previous runs</h1>
        <p className="mt-1 text-sm text-zinc-500">Browse past LinkedIn fetch reports</p>
      </header>

      {error ? <div className="py-4 text-sm text-red-600">{error}</div> : null}

      {loading ? (
        <LoadingState label="Loading…" />
      ) : runs.length === 0 ? (
        <div className="py-12 text-center text-sm text-zinc-400">No runs stored yet.</div>
      ) : (
        <>
          <div className="mt-2 divide-y divide-zinc-200">
            {runs.map((run) => (
              <RunHistoryRow key={run.fetchedAt} run={run} />
            ))}
          </div>

          <RunHistoryPagination
            page={page}
            hasNext={Boolean(nextCursor)}
            onPrevious={goToPreviousPage}
            onNext={goToNextPage}
          />
        </>
      )}
    </main>
  );
}
