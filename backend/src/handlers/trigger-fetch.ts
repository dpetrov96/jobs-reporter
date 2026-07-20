import { InvokeCommand, LambdaClient } from "@aws-sdk/client-lambda";
import type { APIGatewayProxyHandlerV2 } from "aws-lambda";
import {
  getManualTriggerStatus,
  recordManualTrigger,
} from "../services/runs/rate-limit.js";
import { resolveScrapeRegionId } from "../shared/scrapeRegions.js";
import type { ScrapeRegionId } from "../shared/scrapeRegions.js";
import { jsonResponse, optionsResponse } from "./http-response.js";

const lambda = new LambdaClient({});

function getFetchJobsFunctionArn(region: ScrapeRegionId): string {
  if (region === "usa") {
    return process.env.FETCH_JOBS_US_FUNCTION_ARN?.trim() || "";
  }
  return process.env.FETCH_JOBS_FUNCTION_ARN?.trim() || "";
}

function resolveRegion(event: { queryStringParameters?: Record<string, string | undefined>; body?: string }): ScrapeRegionId {
  const fromQuery = event.queryStringParameters?.region;
  if (fromQuery) return resolveScrapeRegionId(fromQuery);

  if (event.body) {
    try {
      const parsed = JSON.parse(event.body) as { region?: string };
      if (parsed.region) return resolveScrapeRegionId(parsed.region);
    } catch {
      // ignore invalid JSON body
    }
  }

  return "europe";
}

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  const method = event.requestContext.http.method;

  if (method === "OPTIONS") {
    return optionsResponse();
  }

  const region = resolveRegion(event);

  try {
    if (method === "GET") {
      const status = await getManualTriggerStatus(region);
      return jsonResponse(200, { ok: true, region, ...status });
    }

    if (method === "POST") {
      const status = await getManualTriggerStatus(region);

      if (!status.canTrigger) {
        return jsonResponse(429, {
          ok: false,
          region,
          error: status.reason ?? "Rate limit exceeded",
          retryAfterSeconds: status.retryAfterSeconds,
          cooldownMinutes: status.cooldownMinutes,
        });
      }

      const functionArn = getFetchJobsFunctionArn(region);
      if (!functionArn) {
        return jsonResponse(500, {
          ok: false,
          region,
          error:
            region === "usa"
              ? "FETCH_JOBS_US_FUNCTION_ARN not configured"
              : "FETCH_JOBS_FUNCTION_ARN not configured",
        });
      }

      await recordManualTrigger(region);

      await lambda.send(
        new InvokeCommand({
          FunctionName: functionArn,
          InvocationType: "Event",
        })
      );

      const nextStatus = await getManualTriggerStatus(region);

      return jsonResponse(202, {
        ok: true,
        region,
        message: "Fetch started in background",
        retryAfterSeconds: nextStatus.retryAfterSeconds || nextStatus.cooldownMinutes * 60,
        cooldownMinutes: nextStatus.cooldownMinutes,
      });
    }

    return jsonResponse(405, { ok: false, error: "Method not allowed" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Trigger failed";
    return jsonResponse(500, { ok: false, error: message });
  }
};
