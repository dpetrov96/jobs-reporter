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
    <div className="flex items-center gap-3 py-8 text-sm text-zinc-400">
      <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-zinc-300 border-t-transparent" />
      {label}
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return <div className="py-4 text-sm text-red-600">{message}</div>;
}

function RunHistoryRow({ run }: { run: JobRunRecord }) {
  const normalized = normalizeRun(run);
  const previewCountries = normalized.countries.filter((c) => c.totalJobs > 0).slice(0, 4);

  return (
    <Link
      to={`/runs/${encodeRunId(run.fetchedAt)}`}
      className="group flex flex-col gap-2 border-b border-zinc-100 py-4 sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="min-w-0">
        <div className="font-medium text-zinc-900 group-hover:text-emerald-700">
          {formatRunDate(run.fetchedAt)}
        </div>
        <div className="mt-0.5 text-xs text-zinc-400">
          {normalized.location} · {run.postedWithinLabel} · {normalized.countryCount} countries
        </div>
        {previewCountries.length > 0 ? (
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {previewCountries.map((country) => (
              <span
                key={country.code}
                className="inline-flex items-center gap-1 text-xs text-zinc-500"
              >
                <CountryFlag code={country.code} location={country.location} flag={country.flag} size="sm" />
                {country.totalJobs}
              </span>
            ))}
          </div>
        ) : null}
      </div>
      <div className="flex shrink-0 items-center gap-3 text-xs text-zinc-400">
        <span className="tabular-nums text-zinc-600">{run.totalJobs} jobs</span>
        <span>{run.emailSent ? "Email sent" : "No email"}</span>
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
      <main className="mx-auto max-w-2xl px-4 py-4 sm:px-6">
        <RunNowButton apiUrl={apiUrl} onTriggered={() => void loadLatest()} />
        <LoadingState label="Loading…" />
      </main>
    );
  }

  if (error && !latestRun) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-4 sm:px-6">
        <RunNowButton apiUrl={apiUrl} onTriggered={() => void loadLatest()} />
        <ErrorState message={error} />
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-4 sm:px-6">
      <RunNowButton
        apiUrl={apiUrl}
        onTriggered={() => {
          window.setTimeout(() => void loadLatest(), 5000);
        }}
      />

      {!latestRun ? (
        <div className="py-12 text-center text-sm text-zinc-400">No runs stored yet.</div>
      ) : (
        <RunReport run={latestRun} />
      )}

      {latestRun && (
        <section className="mt-10">
          <h2 className="mb-2 text-xs font-medium uppercase tracking-wider text-zinc-400">
            Previous runs
          </h2>

          {error && latestRun ? <ErrorState message={error} /> : null}

          {loadingHistory ? (
            <LoadingState label="Loading…" />
          ) : historyRuns.length === 0 ? (
            <div className="py-8 text-sm text-zinc-400">No previous runs yet.</div>
          ) : (
            <>
              <div>
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
