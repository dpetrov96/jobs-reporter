import type { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { getJobRun } from "../services/runs/index.js";
import { jsonResponse, optionsResponse } from "./http-response.js";

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  if (event.requestContext.http.method === "OPTIONS") {
    return optionsResponse();
  }

  try {
    const fetchedAt = event.pathParameters?.fetchedAt;

    if (!fetchedAt) {
      return jsonResponse(400, { ok: false, error: "fetchedAt path parameter is required" });
    }

    const run = await getJobRun(decodeURIComponent(fetchedAt));

    if (!run) {
      return jsonResponse(404, { ok: false, error: "Run not found" });
    }

    return jsonResponse(200, { ok: true, run });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to get run";

    return jsonResponse(500, { ok: false, error: message });
  }
};
