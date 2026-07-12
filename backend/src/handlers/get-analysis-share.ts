import type { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { buildAnalysisShareMeta } from "../shared/analysisMeta.js";
import { getAnalysis } from "../services/analyses/index.js";
import { loadAnalysisCountries } from "../services/analyses/countries-store.js";
import { optionsResponse } from "./http-response.js";

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function htmlResponse(statusCode: number, body: string) {
  return {
    statusCode,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=300",
    },
    body,
  };
}

function buildShareHtml(meta: ReturnType<typeof buildAnalysisShareMeta>, pageUrl: string): string {
  const title = escapeHtml(meta.title);
  const description = escapeHtml(meta.description);
  const pageUrlEscaped = escapeHtml(pageUrl);

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${title}</title>
    <meta name="description" content="${description}" />
    <meta property="og:type" content="website" />
    <meta property="og:title" content="${title}" />
    <meta property="og:description" content="${description}" />
    <meta property="og:url" content="${pageUrlEscaped}" />
    <meta name="twitter:card" content="summary" />
    <meta name="twitter:title" content="${title}" />
    <meta name="twitter:description" content="${description}" />
    <meta http-equiv="refresh" content="0;url=${pageUrlEscaped}" />
    <link rel="canonical" href="${pageUrlEscaped}" />
  </head>
  <body>
    <p><a href="${pageUrlEscaped}">${title}</a></p>
  </body>
</html>`;
}

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  if (event.requestContext.http.method === "OPTIONS") {
    return optionsResponse();
  }

  if (event.requestContext.http.method !== "GET") {
    return htmlResponse(405, "Method not allowed");
  }

  try {
    const analysisId = decodeURIComponent(event.pathParameters?.analysisId?.trim() ?? "");

    if (!analysisId) {
      return htmlResponse(400, "analysisId is required");
    }

    const analysis = await getAnalysis(analysisId);
    if (!analysis) {
      return htmlResponse(404, "Analysis not found");
    }

    const countries = await loadAnalysisCountries(analysis.periodStart, analysis.periodEnd);
    const meta = buildAnalysisShareMeta({
      periodStart: analysis.periodStart,
      periodEnd: analysis.periodEnd,
      countries,
      countryCount: countries.length || analysis.countryCount,
      totalJobs: analysis.totalJobs,
      uniqueCompanies: analysis.uniqueCompanies,
    });

    const webBase = (process.env.WEB_URL ?? "http://63.181.35.55").replace(/\/$/, "");
    const pageUrl = `${webBase}/analyses/${encodeURIComponent(analysisId)}`;

    return htmlResponse(200, buildShareHtml(meta, pageUrl));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to build share page";
    return htmlResponse(500, escapeHtml(message));
  }
};
