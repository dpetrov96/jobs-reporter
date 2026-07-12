import type { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { loadAnalysisCountries } from "../services/analyses/countries-store.js";
import {
  cancelDomainEnrichment,
  getAnalysis,
  updateAnalysis,
} from "../services/analyses/index.js";
import { triggerDomainEnrichment } from "../services/analyses/domain-trigger.js";
import { loadOpenAiKey } from "../services/analyses/openai-key.js";
import { getAiConfig } from "../services/analyses/logger.js";
import { jsonResponse, optionsResponse } from "./http-response.js";

interface EnrichDomainsBody {
  countryCode?: string;
  action?: "cancel";
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
    const analysisId = decodeURIComponent(event.pathParameters?.analysisId?.trim() ?? "");
    const body = event.body ? (JSON.parse(event.body) as EnrichDomainsBody) : {};

    if (!analysisId) {
      return jsonResponse(400, { ok: false, error: "analysisId is required" });
    }

    if (body.action === "cancel") {
      const cancelled = await cancelDomainEnrichment(analysisId);
      if (!cancelled) {
        return jsonResponse(404, { ok: false, error: "Analysis not found" });
      }

      return jsonResponse(200, {
        ok: true,
        message: "Domain enrichment stop requested",
        analysis: cancelled,
      });
    }

    const countryCode = body.countryCode?.trim().toUpperCase();

    if (!countryCode) {
      return jsonResponse(400, {
        ok: false,
        error: "countryCode is required — select a market first",
      });
    }

    const analysis = await getAnalysis(analysisId);
    if (!analysis) {
      return jsonResponse(404, { ok: false, error: "Analysis not found" });
    }

    if (analysis.status !== "completed") {
      return jsonResponse(409, {
        ok: false,
        error: "Analysis must be completed before enriching domains",
        analysis,
      });
    }

    const countries = await loadAnalysisCountries(analysis.periodStart, analysis.periodEnd);
    const market = countries.find((entry) => entry.code === countryCode);
    if (!market) {
      return jsonResponse(400, { ok: false, error: `Unknown market: ${countryCode}` });
    }

    if (analysis.domainEnrichmentStatus === "running" || analysis.domainEnrichmentStatus === "pending") {
      const startedAt = analysis.domainEnrichmentStartedAt;
      const isRecent =
        startedAt != null && Date.now() - Date.parse(startedAt) < 15 * 60 * 1000;

      if (isRecent) {
        const runningFor = analysis.domainEnrichmentCountryCode ?? "unknown";
        return jsonResponse(409, {
          ok: false,
          error:
            runningFor === countryCode
              ? "Domain enrichment is already in progress for this market"
              : `Domain enrichment is already running for ${runningFor}`,
          analysis,
        });
      }
    }

    await loadOpenAiKey();
    const aiConfig = getAiConfig();

    if (!aiConfig.keyConfigured) {
      return jsonResponse(503, {
        ok: false,
        error: "OPENAI_API_KEY not configured",
        analysis,
      });
    }

    const marketLabel = market.location;

    await updateAnalysis(analysisId, {
      domainEnrichmentStatus: "pending",
      domainEnrichmentCountryCode: countryCode,
      domainEnrichmentStartedAt: new Date().toISOString(),
      domainEnrichmentProgress: `Starting domain lookup for ${marketLabel}…`,
      domainEnrichmentProcessed: 0,
      domainEnrichmentTotal: undefined,
      domainEnrichmentResults: [],
      domainEnrichmentError: undefined,
      domainEnrichmentCancelRequested: false,
    });

    await triggerDomainEnrichment(
      analysisId,
      analysis.periodStart,
      analysis.periodEnd,
      countryCode
    );

    const updated = await getAnalysis(analysisId);

    return jsonResponse(202, {
      ok: true,
      message: `Domain enrichment started for ${marketLabel}`,
      analysis: updated ?? analysis,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to start domain enrichment";
    return jsonResponse(500, { ok: false, error: message });
  }
};
