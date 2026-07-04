import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { encodeRunId, fetchRuns, formatRunDate } from "@jobs-reporter/shared";
import type { JobRunRecord } from "@jobs-reporter/shared";
import { RunHistoryPagination } from "../components/RunHistoryPagination";
import { RunReport } from "../components/RunReport";

const HISTORY_PAGE_SIZE = 5;

export function RunListPage({ apiUrl }: { apiUrl: string }) {
  const [latestRun, setLatestRun] = useState<JobRunRecord | null>(null);
  const [historyRuns, setHistoryRuns] = useState<JobRunRecord[]>([]);
  const [historyPage, setHistoryPage] = useState(0);
  const [historyCursors, setHistoryCursors] = useState<string[]>([]);
  const [historyNextCursor, setHistoryNextCursor] = useState<string | undefined>();
  const [loadingLatest, setLoadingLatest] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadLatest() {
      setLoadingLatest(true);
      setError(null);

      try {
        const response = await fetchRuns(apiUrl, { limit: 1 });
        if (cancelled) return;

        const latest = response.runs[0] ?? null;
        setLatestRun(latest);
        setHistoryPage(0);
        setHistoryCursors(latest ? [latest.fetchedAt] : []);
        setHistoryRuns([]);
        setHistoryNextCursor(undefined);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load latest run");
          setLatestRun(null);
          setHistoryCursors([]);
        }
      } finally {
        if (!cancelled) setLoadingLatest(false);
      }
    }

    void loadLatest();
    return () => {
      cancelled = true;
    };
  }, [apiUrl]);

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

  if (loadingLatest) return <div className="state-box">Loading latest report…</div>;
  if (error && !latestRun) return <div className="error-box">{error}</div>;

  return (
    <main className="content">
      {!latestRun ? (
        <div className="state-box">No runs stored yet.</div>
      ) : (
        <section className="latest-run">
          <div className="section-head">
            <h2>Latest report</h2>
            <span className="pill">{latestRun.totalJobs} jobs</span>
          </div>
          <RunReport run={latestRun} />
        </section>
      )}

      {latestRun && (
        <section className="history-section">
          <div className="section-head">
            <h2>Previous runs</h2>
            {!loadingHistory && (
              <span className="pill">
                {historyRuns.length === 0 ? "No older runs" : `Page ${historyPage + 1}`}
              </span>
            )}
          </div>

          {error && latestRun ? <div className="error-box">{error}</div> : null}

          {loadingHistory ? (
            <div className="state-box">Loading previous runs…</div>
          ) : historyRuns.length === 0 ? (
            <div className="state-box">No previous runs yet.</div>
          ) : (
            <>
              <div className="run-table">
                {historyRuns.map((run) => (
                  <Link
                    key={run.fetchedAt}
                    className="run-row"
                    to={`/runs/${encodeRunId(run.fetchedAt)}`}
                  >
                    <div>
                      <div className="run-title">{formatRunDate(run.fetchedAt)}</div>
                      <div className="run-meta">
                        {run.location} · {run.postedWithinLabel} · {run.categoryCount} keywords
                      </div>
                    </div>
                    <div className="run-stats">
                      <span className="badge">{run.totalJobs} jobs</span>
                      <span className={`status ${run.emailSent ? "ok" : "muted"}`}>
                        {run.emailSent ? "Email sent" : "No email"}
                      </span>
                    </div>
                  </Link>
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
