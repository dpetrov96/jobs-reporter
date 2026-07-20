import type { APIGatewayProxyHandlerV2 } from "aws-lambda";
import {
  listJobRunsFiltered,
  projectRunForList,
  type ReportKindFilter,
} from "../services/runs/index.js";
import { resolveScrapeRegionId } from "../shared/scrapeRegions.js";
import { jsonResponse, optionsResponse } from "./http-response.js";

function resolveReportKind(raw?: string): ReportKindFilter {
  const value = raw?.trim().toLowerCase();
  if (value === "daily" || value === "hourly") return value;
  return "all";
}

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  if (event.requestContext.http.method === "OPTIONS") {
    return optionsResponse();
  }

  try {
    const rawLimit = event.queryStringParameters?.limit;
    const limit = rawLimit ? Math.min(Math.max(Number(rawLimit), 1), 50) : 20;
    const cursor = event.queryStringParameters?.cursor?.trim() || undefined;
    const regionRaw = event.queryStringParameters?.region?.trim();
    const region = regionRaw ? resolveScrapeRegionId(regionRaw) : undefined;
    const reportKind = resolveReportKind(event.queryStringParameters?.kind);

    const { runs, nextCursor } = await listJobRunsFiltered(
      limit,
      cursor,
      reportKind,
      region
    );

    return jsonResponse(200, {
      ok: true,
      count: runs.length,
      runs: runs.map(projectRunForList),
      ...(nextCursor ? { nextCursor } : {}),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to list runs";

    return jsonResponse(500, { ok: false, error: message });
  }
};
