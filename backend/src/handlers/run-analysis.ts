import type { Handler } from "aws-lambda";
import { generateAiRecommendations } from "../services/analyses/ai.js";
import { fetchJobDescriptionsForSamples } from "../services/analyses/descriptions.js";
import {
  addRunsToAccumulator,
  createAnalysisAccumulator,
  finalizeAccumulator,
} from "../services/analyses/compute.js";
import { getAnalysis, updateAnalysis } from "../services/analyses/index.js";
import { saveAnalysisCompanies } from "../services/analyses/companies.js";
import { saveAnalysisCountries } from "../services/analyses/countries-store.js";
import { analysisLog, getAiConfig } from "../services/analyses/logger.js";
import { loadOpenAiKey } from "../services/analyses/openai-key.js";
import { listJobRunsInPeriodPage } from "../services/runs/index.js";

interface RunAnalysisEvent {
  analysisId: string;
  periodStart: string;
  periodEnd: string;
}

const RUNS_PAGE_SIZE = 8;
const DUPLICATE_GUARD_MS = 4 * 60 * 1000;

async function setProgress(
  analysisId: string,
  progressMessage: string,
  extra: Record<string, unknown> = {}
) {
  const ai = getAiConfig();
  await updateAnalysis(analysisId, {
    progressMessage,
    aiKeyConfigured: ai.keyConfigured,
    aiEnabled: ai.enabled,
    ...extra,
  });
}

export const handler: Handler<RunAnalysisEvent> = async (event) => {
  const { analysisId, periodStart, periodEnd } = event;

  if (!analysisId || !periodStart || !periodEnd) {
    throw new Error("analysisId, periodStart, and periodEnd are required");
  }

  await loadOpenAiKey();
  const aiConfig = getAiConfig();

  analysisLog({
    analysisId,
    periodStart,
    periodEnd,
    phase: "start",
    message: "Analysis worker started",
    aiKeyConfigured: aiConfig.keyConfigured,
    aiEnabled: aiConfig.enabled,
    aiModel: aiConfig.model,
  });

  analysisLog({
    analysisId,
    phase: "ai_check",
    message: `AI config: enabled=${aiConfig.enabled}, key=${aiConfig.keyPreview}, model=${aiConfig.model}`,
    aiKeyConfigured: aiConfig.keyConfigured,
    aiEnabled: aiConfig.enabled,
    aiModel: aiConfig.model,
  });

  const existing = await getAnalysis(analysisId);
  if (!existing) {
    analysisLog({
      analysisId,
      phase: "failed",
      message: "Analysis record not found in DynamoDB",
      error: "Analysis not found",
    });
    throw new Error("Analysis not found");
  }

  if (existing.status === "completed") {
    analysisLog({
      analysisId,
      phase: "guard",
      message: "Skipping — analysis already completed",
    });
    return;
  }

  if (existing.status === "failed" && existing.error === "Спрян от потребителя") {
    analysisLog({
      analysisId,
      phase: "guard",
      message: "Skipping — analysis was cancelled by user",
    });
    return;
  }

  if (existing.status === "running" && existing.startedAt) {
    const elapsed = Date.now() - Date.parse(existing.startedAt);
    if (elapsed < DUPLICATE_GUARD_MS) {
      analysisLog({
        analysisId,
        phase: "guard",
        message: `Skipping duplicate invoke (running for ${Math.round(elapsed / 1000)}s)`,
        elapsedMs: elapsed,
      });
      return;
    }

    analysisLog({
      analysisId,
      phase: "guard",
      message: `Resuming stale run after ${Math.round(elapsed / 1000)}s`,
      elapsedMs: elapsed,
    });
  }

  const startedAt = new Date().toISOString();

  await updateAnalysis(analysisId, {
    status: "running",
    startedAt,
    error: undefined,
    progressMessage: "Стартиране на анализа…",
    aiKeyConfigured: aiConfig.keyConfigured,
    aiEnabled: aiConfig.enabled,
  });

  try {
    const acc = createAnalysisAccumulator();
    let cursor: string | undefined;
    let page = 0;

    await setProgress(
      analysisId,
      `Зареждане на скрейпове… (AI: ${aiConfig.enabled ? "включен" : "изключен — няма ключ"})`
    );

    do {
      page += 1;
      const pageStarted = Date.now();

      const batch = await listJobRunsInPeriodPage(
        periodStart,
        periodEnd,
        RUNS_PAGE_SIZE,
        cursor
      );

      if (batch.runs.length > 0) {
        addRunsToAccumulator(acc, batch.runs);
      }

      cursor = batch.nextCursor;

      analysisLog({
        analysisId,
        phase: "load_runs",
        message: `Loaded scrape page ${page}: ${batch.runs.length} runs`,
        page,
        pageRuns: batch.runs.length,
        runCount: acc.runCount,
        totalJobs: acc.totalJobs,
        uniqueJobs: acc.seenJobIds.size,
        elapsedMs: Date.now() - pageStarted,
      });

      await setProgress(
        analysisId,
        `Зареждане на скрейпове… страница ${page}, ${acc.runCount} сканирания, ${acc.seenJobIds.size} уникални позиции`
      );
    } while (cursor);

    if (acc.runCount === 0) {
      analysisLog({
        analysisId,
        phase: "failed",
        message: "No fetch runs in period",
        error: "No fetch runs found for this period",
      });

      await updateAnalysis(analysisId, {
        status: "failed",
        completedAt: new Date().toISOString(),
        error: "No fetch runs found for this period",
        progressMessage: "Няма скрейпове за този период",
        runCount: 0,
        totalJobs: 0,
        uniqueJobs: 0,
        countries: [],
      });
      return;
    }

    await setProgress(analysisId, `Изчисляване на статистики за ${acc.runCount} сканирания…`);

    const computeStarted = Date.now();
    const computed = finalizeAccumulator(acc);

    analysisLog({
      analysisId,
      phase: "compute",
      message: "Aggregation complete",
      runCount: computed.runCount,
      totalJobs: computed.totalJobs,
      uniqueJobs: computed.uniqueJobs,
      countryCount: computed.countries.length,
      elapsedMs: Date.now() - computeStarted,
    });

    await setProgress(
      analysisId,
      aiConfig.enabled
        ? `Зареждане на job descriptions за AI (${computed.jobSamples.length} обяви)…`
        : "AI пропуснат — липсва OPENAI_API_KEY"
    );

    const descriptionContexts = aiConfig.enabled
      ? await fetchJobDescriptionsForSamples(computed.jobSamples, {
          maxSamples: 28,
          onProgress: (message) => setProgress(analysisId, message),
        })
      : [];

    await setProgress(
      analysisId,
      aiConfig.enabled
        ? `AI анализ (${aiConfig.model}) с ${descriptionContexts.length} descriptions…`
        : "AI пропуснат — липсва OPENAI_API_KEY"
    );

    const aiStarted = Date.now();
    const ai = await generateAiRecommendations(computed, {
      analysisId,
      descriptionContexts,
    });

    analysisLog({
      analysisId,
      phase: "ai_done",
      message: ai.skipped
        ? `AI skipped: ${ai.skipReason ?? "unknown"}`
        : `AI recommendations generated (${ai.recommendations?.length ?? 0} chars)`,
      aiSkipped: ai.skipped,
      aiEnabled: aiConfig.enabled,
      aiKeyConfigured: aiConfig.keyConfigured,
      aiModel: aiConfig.model,
      elapsedMs: Date.now() - aiStarted,
    });

    await setProgress(analysisId, "Записване на резултатите…");

    await updateAnalysis(analysisId, {
      status: "completed",
      completedAt: new Date().toISOString(),
      runCount: computed.runCount,
      totalJobs: computed.totalJobs,
      uniqueJobs: computed.uniqueJobs,
      uniqueCompanies: computed.uniqueCompanies,
      countryCount: computed.countries.length,
      countries: [],
      aiRecommendations: ai.recommendations,
      aiSkipped: ai.skipped,
      aiSkipReason: ai.skipReason,
      progressMessage: ai.skipped
        ? `Завършен без AI: ${ai.skipReason ?? "неизвестна причина"}`
        : "Завършен с AI препоръки",
      aiKeyConfigured: aiConfig.keyConfigured,
      aiEnabled: aiConfig.enabled,
    });

    await Promise.all([
      saveAnalysisCountries(periodStart, periodEnd, computed.countries),
      saveAnalysisCompanies(periodStart, periodEnd, computed.globalCompanies),
    ]);

    analysisLog({
      analysisId,
      phase: "complete",
      message: "Analysis saved successfully",
      runCount: computed.runCount,
      uniqueJobs: computed.uniqueJobs,
      countryCount: computed.countries.length,
      aiSkipped: ai.skipped,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Analysis failed";

    analysisLog({
      analysisId,
      phase: "failed",
      message: "Analysis worker failed",
      error: message,
    });

    await updateAnalysis(analysisId, {
      status: "failed",
      completedAt: new Date().toISOString(),
      error: message,
      progressMessage: `Грешка: ${message}`,
    });

    throw error;
  }
};
