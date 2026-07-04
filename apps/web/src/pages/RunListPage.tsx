import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { encodeRunId, fetchRuns, formatRunDate } from "@jobs-reporter/shared";
import type { JobRunRecord } from "@jobs-reporter/shared";

export function RunListPage({ apiUrl }: { apiUrl: string }) {
  const [runs, setRuns] = useState<JobRunRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const response = await fetchRuns(apiUrl, 30);
        if (!cancelled) setRuns(response.runs);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load runs");
          setRuns([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [apiUrl]);

  if (loading) return <div className="state-box">Loading run history…</div>;
  if (error) return <div className="error-box">{error}</div>;

  return (
    <main className="content">
      <div className="panel-head">
        <h2>Run history</h2>
        <span className="pill">{runs.length} runs</span>
      </div>

      {runs.length === 0 ? (
        <div className="state-box">No runs stored yet.</div>
      ) : (
        <div className="run-table">
          {runs.map((run) => (
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
      )}
    </main>
  );
}
