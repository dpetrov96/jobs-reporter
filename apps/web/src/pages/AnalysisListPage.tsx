import { useCallback, useEffect, useState } from "react";
import { ANALYSIS_PRODUCT_TITLE, fetchAnalyses, isAnalysisRecord } from "@jobs-reporter/shared";
import type { AnalysisRecord } from "@jobs-reporter/shared";
import { AnalysisHistoryRow } from "../components/AnalysisHistoryRow";
import { StartAnalysisForm } from "../components/StartAnalysisForm";
import { useAllRuns } from "../hooks/useAllRuns";
import { usePageMeta } from "../hooks/usePageMeta";

function LoadingState({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 py-8 text-sm text-zinc-400">
      <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-zinc-300 border-t-transparent" />
      {label}
    </div>
  );
}

export function AnalysisListPage({ apiUrl }: { apiUrl: string }) {
  const [analyses, setAnalyses] = useState<AnalysisRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  usePageMeta({
    title: `${ANALYSIS_PRODUCT_TITLE} | Jobs Reporter`,
    description: "EU job market analytics from LinkedIn hiring data",
    ogTitle: ANALYSIS_PRODUCT_TITLE,
    ogDescription: "EU job market analytics from LinkedIn hiring data",
    ogUrl: typeof window !== "undefined" ? window.location.href : undefined,
  });

  const { runs, loading: runsLoading, error: runsError } = useAllRuns(apiUrl);

  const loadAnalyses = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetchAnalyses(apiUrl, { limit: 50 });
      setAnalyses(response.analyses.filter(isAnalysisRecord));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
      setAnalyses([]);
    } finally {
      setLoading(false);
    }
  }, [apiUrl]);

  useEffect(() => {
    void loadAnalyses();
  }, [loadAnalyses]);

  function handleStarted(analysis: AnalysisRecord) {
    setAnalyses((current) => {
      const exists = current.some((item) => item.fetchedAt === analysis.fetchedAt);
      if (exists) return current;
      return [analysis, ...current];
    });
  }

  return (
    <main className="mx-auto max-w-3xl px-3 py-3 sm:px-6 sm:py-5 lg:max-w-4xl">
      <header className="border-b border-zinc-200 pb-4">
        <h1 className="text-lg font-semibold text-zinc-900 sm:text-xl">Market analyses</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Roles, technologies and posting times by country
        </p>
      </header>

      <div className="mt-4">
        <StartAnalysisForm
          apiUrl={apiUrl}
          runs={runs}
          runsLoading={runsLoading}
          runsError={runsError}
          existingPeriods={analyses}
          onStarted={handleStarted}
        />
      </div>

      <section className="mt-8">
        <h2 className="text-sm font-semibold text-zinc-800">Previous analyses</h2>

        {error ? <div className="py-4 text-sm text-red-600">{error}</div> : null}

        {loading ? (
          <LoadingState label="Loading…" />
        ) : analyses.length === 0 ? (
          <div className="py-12 text-center text-sm text-zinc-400">
            No analyses yet. Start the first one using the form above.
          </div>
        ) : (
          <div className="mt-2 divide-y divide-zinc-200">
            {analyses.map((analysis) => (
              <AnalysisHistoryRow key={analysis.fetchedAt} analysis={analysis} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
