import type { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { listAnalyses } from "../services/analyses/index.js";
import { jsonResponse, optionsResponse } from "./http-response.js";

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  if (event.requestContext.http.method === "OPTIONS") {
    return optionsResponse();
  }

  try {
    const rawLimit = event.queryStringParameters?.limit;
    const limit = rawLimit ? Math.min(Math.max(Number(rawLimit), 1), 50) : 20;
    const cursor = event.queryStringParameters?.cursor?.trim() || undefined;
    const { analyses, nextCursor } = await listAnalyses(limit, cursor);

    return jsonResponse(200, {
      ok: true,
      count: analyses.length,
      analyses,
      ...(nextCursor ? { nextCursor } : {}),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to list analyses";

    return jsonResponse(500, { ok: false, error: message });
  }
};
