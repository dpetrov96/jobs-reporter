import type { APIGatewayProxyHandlerV2 } from "aws-lambda";
import {
  cancelAnalysis,
  getAnalysisWithCompanies,
  reanalyzeAnalysis,
  reconcileAnalysisStatus,
  reconcileDomainEnrichmentStatus,
} from "../services/analyses/index.js";
import { jsonResponse, optionsResponse } from "./http-response.js";

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  if (event.requestContext.http.method === "OPTIONS") {
    return optionsResponse();
  }

  if (event.requestContext.http.method !== "GET") {
    return jsonResponse(405, { ok: false, error: "Method not allowed" });
  }

  try {
    const analysisId = decodeURIComponent(event.pathParameters?.analysisId?.trim() ?? "");

    if (!analysisId) {
      return jsonResponse(400, { ok: false, error: "analysisId is required" });
    }

    if (event.queryStringParameters?.reanalyze === "true") {
      try {
        const analysis = await reanalyzeAnalysis(analysisId);
        return jsonResponse(202, {
          ok: true,
          message: "Analysis restarted",
          analysis,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to reanalyze";
        if (message.includes("not found")) {
          return jsonResponse(404, { ok: false, error: message });
        }
        if (message.includes("in progress")) {
          return jsonResponse(409, { ok: false, error: message });
        }
        throw error;
      }
    }

    if (event.queryStringParameters?.cancel === "true") {
      const cancelled = await cancelAnalysis(analysisId);
      if (!cancelled) {
        return jsonResponse(404, { ok: false, error: "Analysis not found" });
      }

      return jsonResponse(200, {
        ok: true,
        message: "Analysis cancelled",
        analysis: cancelled,
      });
    }

    const analysis = await getAnalysisWithCompanies(analysisId);

    if (!analysis) {
      return jsonResponse(404, { ok: false, error: "Analysis not found" });
    }

    const reconciled = await reconcileAnalysisStatus(analysis);
    const withDomains = await reconcileDomainEnrichmentStatus(reconciled);

    return jsonResponse(200, { ok: true, analysis: withDomains });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to get analysis";

    return jsonResponse(500, { ok: false, error: message });
  }
};
