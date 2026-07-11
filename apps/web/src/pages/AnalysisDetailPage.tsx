import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  fetchAnalysis,
  formatAnalysisPeriod,
  isAnalysisInProgress,
} from "@jobs-reporter/shared";
import type { AnalysisRecord } from "@jobs-reporter/shared";
import { AnalysisStatusBadge } from "../components/AnalysisStatusBadge";
import { CountryAnalysisCard } from "../components/CountryAnalysisCard";
import { useAnalysisWatch } from "../hooks/useAnalysisWatch";

function LoadingState({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 py-8 text-sm text-zinc-400">
      <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-zinc-300 border-t-transparent" />
      {label}
    </div>
  );
}

function AiRecommendations({ content }: { content: string }) {
  const lines = content.split("\n");

  return (
    <section className="rounded-xl border border-violet-200 bg-violet-50/40 p-4 sm:p-5">
      <h2 className="text-sm font-semibold text-violet-900">AI препоръки за обучение</h2>
      <p className="mt-1 text-xs text-violet-700">
        Какви фреймуърци и технологии да учим, за да не изоставаме от пазара
      </p>
      <div className="prose prose-sm mt-4 max-w-none text-zinc-800">
        {lines.map((line, index) => {
          if (line.startsWith("## ")) {
            return (
              <h3 key={index} className="mt-4 text-sm font-semibold text-zinc-900">
                {line.slice(3)}
              </h3>
            );
          }
          if (line.startsWith("### ")) {
            return (
              <h4 key={index} className="mt-3 text-sm font-medium text-zinc-800">
                {line.slice(4)}
              </h4>
            );
          }
          if (line.startsWith("- ") || line.startsWith("* ")) {
            return (
              <p key={index} className="ml-4 text-sm leading-relaxed text-zinc-700">
                • {line.slice(2)}
              </p>
            );
          }
          if (!line.trim()) return <div key={index} className="h-2" />;
          return (
            <p key={index} className="text-sm leading-relaxed text-zinc-700">
              {line}
            </p>
          );
        })}
      </div>
    </section>
  );
}

export function AnalysisDetailPage({ apiUrl }: { apiUrl: string }) {
  const { analysisId: encodedId } = useParams<{ analysisId: string }>();
  const analysisId = encodedId ? decodeURIComponent(encodedId) : "";

  const [analysis, setAnalysis] = useState<AnalysisRecord | null>(null);
  const [loading, setLoading] = useState(true);
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
        setError("Анализът не е намерен");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Неуспешно зареждане");
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

  const inProgress = analysis ? isAnalysisInProgress(analysis.status) : false;

  return (
    <main className="mx-auto max-w-3xl px-3 py-3 sm:px-6 sm:py-5 lg:max-w-4xl">
      <header className="border-b border-zinc-200 pb-4">
        <Link
          to="/analyses"
          className="text-xs text-zinc-400 transition hover:text-zinc-600"
        >
          ← Всички анализи
        </Link>

        {analysis ? (
          <>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <h1 className="text-lg font-semibold text-zinc-900 sm:text-xl">
                {formatAnalysisPeriod(analysis.periodStart, analysis.periodEnd)}
              </h1>
              <AnalysisStatusBadge status={analysis.status} />
            </div>
            {analysis.status === "completed" ? (
              <p className="mt-1 text-sm text-zinc-500">
                {analysis.runCount} сканирания · {analysis.uniqueJobs} уникални позиции ·{" "}
                {analysis.countries.length} държави
              </p>
            ) : null}
          </>
        ) : (
          <h1 className="mt-2 text-lg font-semibold text-zinc-900 sm:text-xl">Анализ</h1>
        )}
      </header>

      {error ? <div className="py-4 text-sm text-red-600">{error}</div> : null}

      {loading ? (
        <LoadingState label="Зареждане…" />
      ) : analysis?.status === "failed" ? (
        <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {analysis.error ?? "Анализът е неуспешен"}
        </div>
      ) : inProgress ? (
        <div className="mt-6 rounded-xl border border-blue-200 bg-blue-50/50 p-6 text-center">
          <span className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-blue-300 border-t-blue-600" />
          <p className="mt-3 text-sm font-medium text-blue-900">Анализът се изпълнява…</p>
          <p className="mt-1 text-xs text-blue-700">
            Можеш да затвориш или презаредиш страницата — процесът продължава във фонов режим.
          </p>
        </div>
      ) : analysis?.status === "completed" ? (
        <div className="mt-6 space-y-6">
          {analysis.aiRecommendations ? (
            <AiRecommendations content={analysis.aiRecommendations} />
          ) : analysis.aiSkipped ? (
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-600">
              AI препоръките не са налични: {analysis.aiSkipReason ?? "не е конфигуриран API ключ"}
            </div>
          ) : null}

          {analysis.countries.map((country) => (
            <CountryAnalysisCard key={country.code} country={country} />
          ))}
        </div>
      ) : null}
    </main>
  );
}
