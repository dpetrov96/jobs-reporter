import type { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { buildDaySummaryRun } from "../services/report/buildDaySummary.js";
import { getScrapeRegion, resolveScrapeRegionId, regionDateKey } from "../shared/scrapeRegions.js";
import { jsonResponse, optionsResponse } from "./http-response.js";

function resolveDayKey(raw: string | undefined, timezone: string): string | null {
  const value = raw?.trim();
  if (!value || value.toLowerCase() === "today") {
    return regionDateKey(new Date(), timezone);
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }

  return null;
}

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  if (event.requestContext.http.method === "OPTIONS") {
    return optionsResponse();
  }

  try {
    const regionId = resolveScrapeRegionId(event.queryStringParameters?.region?.trim());
    const regionConfig = getScrapeRegion(regionId);
    const dayKey = resolveDayKey(event.queryStringParameters?.day, regionConfig.timezone);

    if (!dayKey) {
      return jsonResponse(400, {
        ok: false,
        error: "day must be YYYY-MM-DD or 'today'",
      });
    }

    const run = await buildDaySummaryRun(regionId, dayKey);

    if (!run) {
      return jsonResponse(404, {
        ok: false,
        error: "No hourly scrapes found for this day",
      });
    }

    return jsonResponse(200, { ok: true, run });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to build day summary";

    return jsonResponse(500, { ok: false, error: message });
  }
};
