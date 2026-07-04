import { InvokeCommand, LambdaClient } from "@aws-sdk/client-lambda";
import type { APIGatewayProxyHandlerV2 } from "aws-lambda";
import {
  getManualTriggerStatus,
  recordManualTrigger,
} from "../services/runs/rate-limit.js";
import { jsonResponse, optionsResponse } from "./http-response.js";

const lambda = new LambdaClient({});

function getFetchJobsFunctionArn(): string {
  return process.env.FETCH_JOBS_FUNCTION_ARN?.trim() || "";
}

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  const method = event.requestContext.http.method;

  if (method === "OPTIONS") {
    return optionsResponse();
  }

  try {
    if (method === "GET") {
      const status = await getManualTriggerStatus();
      return jsonResponse(200, { ok: true, ...status });
    }

    if (method === "POST") {
      const status = await getManualTriggerStatus();

      if (!status.canTrigger) {
        return jsonResponse(429, {
          ok: false,
          error: status.reason ?? "Rate limit exceeded",
          retryAfterSeconds: status.retryAfterSeconds,
          cooldownMinutes: status.cooldownMinutes,
        });
      }

      const functionArn = getFetchJobsFunctionArn();
      if (!functionArn) {
        return jsonResponse(500, {
          ok: false,
          error: "FETCH_JOBS_FUNCTION_ARN not configured",
        });
      }

      await recordManualTrigger();

      await lambda.send(
        new InvokeCommand({
          FunctionName: functionArn,
          InvocationType: "Event",
        })
      );

      const nextStatus = await getManualTriggerStatus();

      return jsonResponse(202, {
        ok: true,
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
