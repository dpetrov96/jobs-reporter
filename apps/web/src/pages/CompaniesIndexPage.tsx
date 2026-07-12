import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchAnalyses, isAnalysisRecord } from "@jobs-reporter/shared";
import { companiesPagePath } from "../lib/companyLinks";

export function CompaniesIndexPage({ apiUrl }: { apiUrl: string }) {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const response = await fetchAnalyses(apiUrl, { limit: 30 });
        const latest = response.analyses
          .filter(isAnalysisRecord)
          .find((analysis) => analysis.status === "completed");

        if (cancelled) return;

        if (latest) {
          navigate(companiesPagePath(latest.fetchedAt), { replace: true });
        } else {
          navigate("/analyses", { replace: true });
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load");
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [apiUrl, navigate]);

  if (error) {
    return (
      <main className="mx-auto max-w-6xl px-3 py-12 text-center text-sm text-red-600">{error}</main>
    );
  }

  return (
    <main className="mx-auto flex max-w-6xl items-center justify-center gap-2 px-3 py-16 text-sm text-zinc-400">
      <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-zinc-300 border-t-transparent" />
      Loading companies…
    </main>
  );
}
