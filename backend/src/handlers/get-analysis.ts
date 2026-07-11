import type { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { getAnalysis } from "../services/analyses/index.js";
import { jsonResponse, optionsResponse } from "./http-response.js";

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  if (event.requestContext.http.method === "OPTIONS") {
    return optionsResponse();
  }

  try {
    const analysisId = decodeURIComponent(event.pathParameters?.analysisId?.trim() ?? "");

    if (!analysisId) {
      return jsonResponse(400, { ok: false, error: "analysisId is required" });
    }

    const analysis = await getAnalysis(analysisId);

    if (!analysis) {
      return jsonResponse(404, { ok: false, error: "Analysis not found" });
    }

    return jsonResponse(200, { ok: true, analysis });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to get analysis";

    return jsonResponse(500, { ok: false, error: message });
  }
};
