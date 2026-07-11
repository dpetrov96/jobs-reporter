import { InvokeCommand, LambdaClient } from "@aws-sdk/client-lambda";
import type { APIGatewayProxyHandlerV2 } from "aws-lambda";
import {
  createPendingAnalysis,
  getAnalysisForPeriod,
} from "../services/analyses/index.js";
import { normalizePeriodInput } from "../services/analyses/types.js";
import { jsonResponse, optionsResponse } from "./http-response.js";

const lambda = new LambdaClient({});

function getRunAnalysisFunctionArn(): string {
  return process.env.RUN_ANALYSIS_FUNCTION_ARN?.trim() || "";
}

interface StartAnalysisBody {
  periodStart?: string;
  periodEnd?: string;
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
        error: "periodStart and periodEnd are required (YYYY-MM-DD)",
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
      return jsonResponse(409, {
        ok: false,
        error: "Analysis for this period already exists",
        analysis: existing,
      });
    }

    const functionArn = getRunAnalysisFunctionArn();
    if (!functionArn) {
      return jsonResponse(500, {
        ok: false,
        error: "RUN_ANALYSIS_FUNCTION_ARN not configured",
      });
    }

    const analysis = await createPendingAnalysis({ periodStart, periodEnd });

    await lambda.send(
      new InvokeCommand({
        FunctionName: functionArn,
        InvocationType: "Event",
        Payload: Buffer.from(
          JSON.stringify({
            analysisId: analysis.fetchedAt,
            periodStart,
            periodEnd,
          })
        ),
      })
    );

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
