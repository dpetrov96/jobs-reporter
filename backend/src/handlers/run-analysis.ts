import type { Handler } from "aws-lambda";
import { generateAiRecommendations } from "../services/analyses/ai.js";
import { computeAnalysis } from "../services/analyses/compute.js";
import { updateAnalysis } from "../services/analyses/index.js";
import { listJobRunsInPeriod } from "../services/runs/index.js";

interface RunAnalysisEvent {
  analysisId: string;
  periodStart: string;
  periodEnd: string;
}

export const handler: Handler<RunAnalysisEvent> = async (event) => {
  const { analysisId, periodStart, periodEnd } = event;

  if (!analysisId || !periodStart || !periodEnd) {
    throw new Error("analysisId, periodStart, and periodEnd are required");
  }

  const startedAt = new Date().toISOString();

  await updateAnalysis(analysisId, {
    status: "running",
    startedAt,
  });

  try {
    const runs = await listJobRunsInPeriod(periodStart, periodEnd);

    if (runs.length === 0) {
      await updateAnalysis(analysisId, {
        status: "failed",
        completedAt: new Date().toISOString(),
        error: "No fetch runs found for this period",
        runCount: 0,
        totalJobs: 0,
        uniqueJobs: 0,
        countries: [],
      });
      return;
    }

    const computed = computeAnalysis(runs);
    const ai = await generateAiRecommendations(computed);

    await updateAnalysis(analysisId, {
      status: "completed",
      completedAt: new Date().toISOString(),
      runCount: computed.runCount,
      totalJobs: computed.totalJobs,
      uniqueJobs: computed.uniqueJobs,
      countries: computed.countries,
      aiRecommendations: ai.recommendations,
      aiSkipped: ai.skipped,
      aiSkipReason: ai.skipReason,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Analysis failed";

    await updateAnalysis(analysisId, {
      status: "failed",
      completedAt: new Date().toISOString(),
      error: message,
    });

    throw error;
  }
};
