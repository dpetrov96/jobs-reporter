import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { encodeRunId, fetchRuns, formatRunDate, normalizeRun } from "@jobs-reporter/shared";
import type { JobRunRecord } from "@jobs-reporter/shared";
import { CountryFlag } from "../components/CountryFlag";
import { RunHistoryPagination } from "../components/RunHistoryPagination";
import { RunNowButton } from "../components/RunNowButton";
import { RunReport } from "../components/RunReport";

const HISTORY_PAGE_SIZE = 5;

function LoadingState({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-zinc-200 bg-white px-4 py-6 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
      <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
      {label}
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
      {message}
    </div>
  );
}

function RunHistoryRow({ run }: { run: JobRunRecord }) {
  const normalized = normalizeRun(run);
  const previewCountries = normalized.countries.filter((c) => c.totalJobs > 0).slice(0, 4);

  return (
    <Link
      to={`/runs/${encodeRunId(run.fetchedAt)}`}
      className="group flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm transition hover:border-emerald-300 hover:shadow-md sm:flex-row sm:items-center sm:justify-between dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-emerald-700"
    >
      <div className="min-w-0">
        <div className="font-semibold text-zinc-900 group-hover:text-emerald-700 dark:text-zinc-50 dark:group-hover:text-emerald-400">
          {formatRunDate(run.fetchedAt)}
        </div>
        <div className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          {normalized.location} · {run.postedWithinLabel} · {normalized.countryCount} countries
        </div>
        {previewCountries.length > 0 ? (
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {previewCountries.map((country) => (
              <span
                key={country.code}
                className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
              >
                <CountryFlag code={country.code} location={country.location} flag={country.flag} size="sm" />
                {country.totalJobs}
              </span>
            ))}
          </div>
        ) : null}
      </div>
      <div className="flex shrink-0 flex-col items-start gap-1 sm:items-end">
        <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
          {run.totalJobs} jobs
        </span>
        <span
          className={`text-xs ${
            run.emailSent ? "text-emerald-600 dark:text-emerald-400" : "text-zinc-400"
          }`}
        >
          {run.emailSent ? "Email sent" : "No email"}
        </span>
      </div>
    </Link>
  );
}

export function RunListPage({ apiUrl }: { apiUrl: string }) {
  const [latestRun, setLatestRun] = useState<JobRunRecord | null>(null);
  const [historyRuns, setHistoryRuns] = useState<JobRunRecord[]>([]);
  const [historyPage, setHistoryPage] = useState(0);
  const [historyCursors, setHistoryCursors] = useState<string[]>([]);
  const [historyNextCursor, setHistoryNextCursor] = useState<string | undefined>();
  const [loadingLatest, setLoadingLatest] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadLatest = useCallback(async () => {
    setLoadingLatest(true);
    setError(null);

    try {
      const response = await fetchRuns(apiUrl, { limit: 1 });
      const latest = response.runs[0] ?? null;
      setLatestRun(latest);
      setHistoryPage(0);
      setHistoryCursors(latest ? [latest.fetchedAt] : []);
      setHistoryRuns([]);
      setHistoryNextCursor(undefined);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load latest run");
      setLatestRun(null);
      setHistoryCursors([]);
    } finally {
      setLoadingLatest(false);
    }
  }, [apiUrl]);

  useEffect(() => {
    void loadLatest();
  }, [loadLatest]);

  useEffect(() => {
    const cursor = historyCursors[historyPage];
    if (!cursor) {
      setHistoryRuns([]);
      setHistoryNextCursor(undefined);
      return;
    }

    let cancelled = false;

    async function loadHistory() {
      setLoadingHistory(true);
      setError(null);

      try {
        const response = await fetchRuns(apiUrl, {
          limit: HISTORY_PAGE_SIZE,
          cursor,
        });
        if (cancelled) return;

        setHistoryRuns(response.runs);
        setHistoryNextCursor(response.nextCursor);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load run history");
          setHistoryRuns([]);
          setHistoryNextCursor(undefined);
        }
      } finally {
        if (!cancelled) setLoadingHistory(false);
      }
    }

    void loadHistory();
    return () => {
      cancelled = true;
    };
  }, [apiUrl, historyCursors, historyPage]);

  function goToNextHistoryPage() {
    if (!historyNextCursor) return;

    setHistoryCursors((current) => {
      const next = [...current];
      next[historyPage + 1] = historyNextCursor;
      return next;
    });
    setHistoryPage((current) => current + 1);
  }

  function goToPreviousHistoryPage() {
    setHistoryPage((current) => Math.max(0, current - 1));
  }

  if (loadingLatest) {
    return (
      <main className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:px-6">
        <RunNowButton apiUrl={apiUrl} onTriggered={() => void loadLatest()} />
        <LoadingState label="Loading latest report…" />
      </main>
    );
  }

  if (error && !latestRun) {
    return (
      <main className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:px-6">
        <RunNowButton apiUrl={apiUrl} onTriggered={() => void loadLatest()} />
        <ErrorState message={error} />
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-5xl space-y-8 px-4 py-6 sm:px-6">
      <RunNowButton
        apiUrl={apiUrl}
        onTriggered={() => {
          window.setTimeout(() => void loadLatest(), 5000);
        }}
      />

      {!latestRun ? (
        <div className="rounded-2xl border border-dashed border-zinc-300 px-4 py-10 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
          No runs stored yet.
        </div>
      ) : (
        <section className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">Latest report</h2>
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
              {latestRun.totalJobs} jobs · {normalizeRun(latestRun).countryCount} countries
            </span>
          </div>
          <RunReport run={latestRun} />
        </section>
      )}

      {latestRun && (
        <section className="space-y-4 border-t border-zinc-200 pt-8 dark:border-zinc-800">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">Previous runs</h2>
            {!loadingHistory && (
              <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                {historyRuns.length === 0 ? "No older runs" : `Page ${historyPage + 1}`}
              </span>
            )}
          </div>

          {error && latestRun ? <ErrorState message={error} /> : null}

          {loadingHistory ? (
            <LoadingState label="Loading previous runs…" />
          ) : historyRuns.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-zinc-300 px-4 py-8 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
              No previous runs yet.
            </div>
          ) : (
            <>
              <div className="space-y-3">
                {historyRuns.map((run) => (
                  <RunHistoryRow key={run.fetchedAt} run={run} />
                ))}
              </div>

              <RunHistoryPagination
                page={historyPage}
                hasNext={Boolean(historyNextCursor)}
                onPrevious={goToPreviousHistoryPage}
                onNext={goToNextHistoryPage}
              />
            </>
          )}
        </section>
      )}
    </main>
  );
}
