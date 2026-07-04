import { sendViaResend, isResendConfigured } from "./resend.js";
import { sendViaSes, isSesConfigured } from "./ses.js";
import type { EmailProvider, SendEmailParams, SendEmailResult } from "./types.js";

export type { EmailProvider, SendEmailParams, SendEmailResult };

export function getEmailProvider(): EmailProvider {
  const provider = process.env.EMAIL_PROVIDER?.toLowerCase();
  return provider === "ses" ? "ses" : "resend";
}

export function isEmailConfigured(): boolean {
  return getEmailProvider() === "ses" ? isSesConfigured() : isResendConfigured();
}

export async function sendEmail(params: SendEmailParams): Promise<SendEmailResult> {
  const provider = getEmailProvider();

  if (provider === "ses") {
    return sendViaSes(params);
  }

  return sendViaResend(params);
}

export function buildTestEmailHtml(): string {
  const stage = process.env.APP_STAGE ?? "dev";
  const time = new Date().toISOString();

  return `
    <h2>Lambda LinkedIn Finder — test email</h2>
    <p>Email service works. Stage: <strong>${stage}</strong></p>
    <p>Sent at: ${time}</p>
  `.trim();
}
