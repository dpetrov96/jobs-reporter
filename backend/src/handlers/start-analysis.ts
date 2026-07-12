import type { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { analysisLog, getAiConfig } from "../services/analyses/logger.js";
import {
  createPendingAnalysis,
  getAnalysisForPeriod,
  reconcileAnalysisStatus,
  resetFailedAnalysis,
  updateAnalysis,
} from "../services/analyses/index.js";
import { triggerAnalysisRun } from "../services/analyses/trigger.js";
import { loadOpenAiKey } from "../services/analyses/openai-key.js";
import { normalizePeriodInput } from "../services/analyses/types.js";
import { jsonResponse, optionsResponse } from "./http-response.js";

function getRunAnalysisFunctionArn(): string {
  return process.env.RUN_ANALYSIS_FUNCTION_ARN?.trim() || "";
}

interface StartAnalysisBody {
  periodStart?: string;
  periodEnd?: string;
  periodLabel?: string;
  reanalyze?: boolean;
}

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  const method = event.requestContext.http.method;

  if (method === "OPTIONS") {
    return optionsResponse();
  }

  if (method !== "POST") {
    return jsonResponse(405, { ok: false, error: "Method not allowed" });
  }

  try {
    const body = event.body ? (JSON.parse(event.body) as StartAnalysisBody) : {};
    const rawStart = body.periodStart?.trim();
    const rawEnd = body.periodEnd?.trim();

    if (!rawStart || !rawEnd) {
      return jsonResponse(400, {
        ok: false,
        error: "periodStart and periodEnd are required",
      });
    }

    let periodStart: string;
    let periodEnd: string;

    try {
      periodStart = normalizePeriodInput(rawStart, false);
      periodEnd = normalizePeriodInput(rawEnd, true);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Invalid date";
      return jsonResponse(400, { ok: false, error: message });
    }

    if (Date.parse(periodStart) > Date.parse(periodEnd)) {
      return jsonResponse(400, {
        ok: false,
        error: "periodStart must be before or equal to periodEnd",
      });
    }

    const existing = await getAnalysisForPeriod(periodStart, periodEnd);
    if (existing) {
      const reconciled = await reconcileAnalysisStatus(existing);

      if (reconciled.status === "completed" && !body.reanalyze) {
        return jsonResponse(409, {
          ok: false,
          error: "Analysis for this period already exists",
          analysis: reconciled,
        });
      }

      if (
        (reconciled.status === "pending" || reconciled.status === "running") &&
        !body.reanalyze
      ) {
        return jsonResponse(409, {
          ok: false,
          error: "Analysis for this period is already in progress",
          analysis: reconciled,
        });
      }
    }

    const functionArn = getRunAnalysisFunctionArn();
    if (!functionArn) {
      return jsonResponse(500, {
        ok: false,
        error: "RUN_ANALYSIS_FUNCTION_ARN not configured",
      });
    }

    await loadOpenAiKey();
    const aiConfig = getAiConfig();

    analysisLog({
      phase: "start",
      message: "Analysis trigger accepted",
      periodStart,
      periodEnd,
      aiKeyConfigured: aiConfig.keyConfigured,
      aiEnabled: aiConfig.enabled,
      aiModel: aiConfig.model,
    });

    const analysis =
      existing && (existing.status === "failed" || body.reanalyze)
        ? await resetFailedAnalysis({
            periodStart,
            periodEnd,
            periodLabel: body.periodLabel?.trim() || existing.periodLabel,
          })
        : existing
          ? existing
          : await createPendingAnalysis({
          periodStart,
          periodEnd,
          periodLabel: body.periodLabel?.trim() || undefined,
        });

    await updateAnalysis(analysis.fetchedAt, {
      progressMessage: "Изчаква старт на worker…",
    });

    await triggerAnalysisRun(analysis.fetchedAt, periodStart, periodEnd);

    return jsonResponse(202, {
      ok: true,
      message: "Analysis started in background",
      analysis,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to start analysis";

    if (message.includes("ConditionalCheckFailedException")) {
      return jsonResponse(409, {
        ok: false,
        error: "Analysis for this period already exists",
      });
    }

    return jsonResponse(500, { ok: false, error: message });
  }
};
