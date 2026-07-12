import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import {
  cancelAnalysis,
  fetchAnalysis,
  getAnalysisCountryCount,
  isAnalysisInProgress,
  reanalyzeAnalysis,
  sortByCountryDisplayOrder,
  buildAnalysisShareMeta,
} from "@jobs-reporter/shared";
import type { AnalysisRecord } from "@jobs-reporter/shared";
import { AiAnalysisReport } from "../components/AiAnalysisReport";
import { AnalysisChapterNav } from "../components/AnalysisChapterNav";
import { AnalysisPresentationIntro } from "../components/AnalysisPresentationIntro";
import { AnalysisSlideHeader } from "../components/AnalysisSlideHeader";
import { CountryAnalysisCard } from "../components/CountryAnalysisCard";
import { useAnalysisWatch } from "../hooks/useAnalysisWatch";
import { usePageMeta } from "../hooks/usePageMeta";
import { formatAnalysisProgress } from "../lib/analysisProgressLabel";

function LoadingState({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 py-8 text-sm text-zinc-400">
      <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-zinc-300 border-t-transparent" />
      {label}
    </div>
  );
}

export function AnalysisDetailPage({ apiUrl }: { apiUrl: string }) {
  const { analysisId: encodedId } = useParams<{ analysisId: string }>();
  const analysisId = encodedId ? decodeURIComponent(encodedId) : "";

  const [analysis, setAnalysis] = useState<AnalysisRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [reanalyzing, setReanalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadAnalysis = useCallback(async () => {
    if (!analysisId) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetchAnalysis(apiUrl, analysisId);
      if (response.analysis) {
        setAnalysis(response.analysis);
      } else {
        setError("Analysis not found");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [apiUrl, analysisId]);

  useEffect(() => {
    void loadAnalysis();
  }, [loadAnalysis]);

  const handleUpdate = useCallback((updated: AnalysisRecord) => {
    setAnalysis(updated);
  }, []);

  useAnalysisWatch(apiUrl, analysis, handleUpdate, Boolean(analysis));

  const pageMeta = useMemo(() => {
    if (!analysis) return null;

    const meta = buildAnalysisShareMeta({
      periodStart: analysis.periodStart,
      periodEnd: analysis.periodEnd,
      countries: analysis.countries,
      countryCount: getAnalysisCountryCount(analysis),
      totalJobs: analysis.totalJobs,
      uniqueCompanies: analysis.uniqueCompanies,
    });

    return {
      ...meta,
      ogUrl: typeof window !== "undefined" ? window.location.href : undefined,
    };
  }, [analysis]);

  usePageMeta(pageMeta);

  const inProgress = analysis ? isAnalysisInProgress(analysis.status) : false;

  async function handleCancel() {
    if (!analysisId || !inProgress) return;

    setCancelling(true);
    setError(null);

    try {
      const response = await cancelAnalysis(apiUrl, analysisId);
      if (response.analysis) {
        setAnalysis(response.analysis);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to cancel");
    } finally {
      setCancelling(false);
    }
  }

  async function handleReanalyze() {
    if (!analysisId || inProgress) return;

    setReanalyzing(true);
    setError(null);

    try {
      const response = await reanalyzeAnalysis(apiUrl, analysisId);
      if (response.analysis) {
        setAnalysis(response.analysis);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to restart");
    } finally {
      setReanalyzing(false);
    }
  }

  const canManage = analysis && !inProgress;
  const sortedCountries = useMemo(
    () => (analysis ? sortByCountryDisplayOrder(analysis.countries ?? []) : []),
    [analysis]
  );

  return (
    <main className="mx-auto max-w-6xl px-3 py-3 sm:px-8 sm:py-6">
      {error ? <div className="py-4 text-sm text-red-600">{error}</div> : null}

      {loading ? (
        <LoadingState label="Loading…" />
      ) : analysis?.status === "failed" ? (
        <div className="mt-2 space-y-4">
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {analysis.error ?? "Analysis failed"}
          </div>
          {canManage ? (
            <button
              type="button"
              onClick={() => void handleReanalyze()}
              disabled={reanalyzing}
              className="rounded-lg bg-[#0a66c2] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#004182] disabled:opacity-50"
            >
              {reanalyzing ? "Starting…" : "Run again"}
            </button>
          ) : null}
        </div>
      ) : inProgress && analysis ? (
        <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-6">
          <div className="text-center">
            <span className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-blue-300 border-t-blue-600" />
            <p className="mt-3 text-sm font-medium text-blue-900">Analysis in progress…</p>
            {analysis.progressMessage ? (
              <p className="mt-2 text-sm text-blue-800">
                {formatAnalysisProgress(analysis.progressMessage)}
              </p>
            ) : null}
          </div>

          <dl className="mt-4 space-y-1.5 rounded-lg bg-white/70 px-3 py-2.5 text-xs text-zinc-600">
            <div className="flex justify-between gap-4">
              <dt>AI key</dt>
              <dd className="font-medium text-zinc-800">
                {analysis.aiKeyConfigured === undefined
                  ? "checking…"
                  : analysis.aiKeyConfigured
                    ? "configured"
                    : "missing"}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt>AI analysis</dt>
              <dd className="font-medium text-zinc-800">
                {analysis.aiEnabled === undefined
                  ? "checking…"
                  : analysis.aiEnabled
                    ? "enabled"
                    : "disabled"}
              </dd>
            </div>
            {analysis.uniqueJobs > 0 ? (
              <div className="flex justify-between gap-4">
                <dt>Progress</dt>
                <dd className="font-medium tabular-nums text-zinc-800">
                  {analysis.uniqueJobs.toLocaleString()} jobs processed
                </dd>
              </div>
            ) : null}
          </dl>

          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => void handleCancel()}
              disabled={cancelling}
              className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-50"
            >
              {cancelling ? "Cancelling…" : "Cancel analysis"}
            </button>
          </div>
        </div>
      ) : analysis?.status === "completed" ? (
        <div className="space-y-8 sm:space-y-12">
          <AnalysisPresentationIntro
            analysis={analysis}
            countries={sortedCountries}
            hasAi={Boolean(analysis.aiRecommendations)}
          />

          <AnalysisChapterNav
            countries={sortedCountries}
            hasAi={Boolean(analysis.aiRecommendations)}
            analysisId={analysis.fetchedAt}
          />

          {analysis.aiRecommendations ? (
            <AiAnalysisReport content={analysis.aiRecommendations} />
          ) : analysis.aiSkipped ? (
            <section id="ai-guide" className="scroll-mt-32 sm:scroll-mt-28">
              <p className="text-sm text-zinc-600">
                AI recommendations unavailable:{" "}
                {formatAnalysisProgress(analysis.aiSkipReason) ??
                  "API key not configured"}
              </p>
            </section>
          ) : null}

          <section id="countries" className="scroll-mt-32 space-y-6 sm:scroll-mt-28 sm:space-y-8">
            <AnalysisSlideHeader
              kicker="Market breakdown"
              title="By country"
              subtitle={`${sortedCountries.length} EU markets · employers, roles, tech & when positions open`}
              tone="emerald"
              icon="🌍"
            />

            {sortedCountries.map((country) => (
              <div key={country.code} id={`country-${country.code}`} className="scroll-mt-32 sm:scroll-mt-28">
                <CountryAnalysisCard country={country} />
              </div>
            ))}
          </section>

          {canManage ? (
            <footer className="-mx-3 mt-12 border-t border-zinc-200 px-3 py-8 sm:-mx-8 sm:mt-16 sm:px-8 sm:py-10">
              <div className="mx-auto flex max-w-6xl flex-col items-center gap-3 text-center">
                <p className="max-w-md text-sm text-zinc-500">
                  Recompute stats and the AI career guide from the latest postings in this period.
                </p>
                <button
                  type="button"
                  onClick={() => void handleReanalyze()}
                  disabled={reanalyzing}
                  className="min-h-11 rounded-full bg-zinc-900 px-8 py-3 text-sm font-medium text-white transition hover:bg-zinc-800 active:scale-[0.98] disabled:opacity-50"
                >
                  {reanalyzing ? "Starting…" : "Run again"}
                </button>
              </div>
            </footer>
          ) : null}
        </div>
      ) : null}
    </main>
  );
}
