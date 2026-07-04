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

  if (loading) return <div className="state-box">Loading report…</div>;
  if (error) return <div className="error-box">{error}</div>;
  if (!run) return <div className="state-box">Run not found.</div>;

  return (
    <main className="content">
      <Link to="/" className="back-link">
        ← Latest report
      </Link>
      <RunReport run={run} />
    </main>
  );
}
