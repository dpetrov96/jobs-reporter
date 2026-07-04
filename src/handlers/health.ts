import type { APIGatewayProxyHandlerV2 } from "aws-lambda";
import {
  buildTestEmailHtml,
  getEmailProvider,
  isEmailConfigured,
  sendEmail,
} from "../services/email/index.js";
import { jsonResponse, optionsResponse } from "./http-response.js";

function isAsciiEmail(email: string): boolean {
  return /^[\x00-\x7F]+$/.test(email) && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  if (event.requestContext.http.method === "OPTIONS") {
    return optionsResponse();
  }

  const sendTest = event.queryStringParameters?.sendTest === "true";
  const reportTo = process.env.REPORT_EMAIL_TO;

  let emailResult = null;

  if (sendTest) {
    if (!reportTo) {
      emailResult = {
        sent: false,
        skipped: true,
        reason: "REPORT_EMAIL_TO missing — set it in env.json or template parameters",
      };
    } else if (!isAsciiEmail(reportTo)) {
      emailResult = {
        sent: false,
        skipped: true,
        reason: `REPORT_EMAIL_TO is invalid: "${reportTo}" — use a real ASCII email like you@gmail.com`,
      };
    } else if (!isEmailConfigured()) {
      emailResult = {
        sent: false,
        skipped: true,
        reason:
          getEmailProvider() === "ses"
            ? "SES not configured — verify EMAIL_FROM domain/address in AWS SES"
            : "RESEND_API_KEY missing",
      };
    } else {
      try {
        emailResult = await sendEmail({
          to: reportTo,
          subject: `[${process.env.APP_STAGE ?? "dev"}] Lambda LinkedIn Finder — test`,
          html: buildTestEmailHtml(),
        });
      } catch (error) {
        emailResult = {
          sent: false,
          skipped: true,
          reason: error instanceof Error ? error.message : "Email send failed",
        };
      }
    }
  }

  return jsonResponse(200, {
    ok: true,
    service: "lambda-linkedin-finder",
    stage: process.env.APP_STAGE ?? "dev",
    emailProvider: getEmailProvider(),
    emailConfigured: isEmailConfigured(),
    emailResult,
    hint: sendTest
      ? undefined
      : "Add ?sendTest=true to send a test email to REPORT_EMAIL_TO",
  });
};
