import { Resend } from "resend";
import type { SendEmailParams, SendEmailResult } from "./types.js";

let client: Resend | null = null;

function getClient(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  if (!client) client = new Resend(apiKey);
  return client;
}

export function isResendConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

export async function sendViaResend(params: SendEmailParams): Promise<SendEmailResult> {
  const resend = getClient();
  if (!resend) {
    return { sent: false, skipped: true, reason: "RESEND_API_KEY missing" };
  }

  const from = params.from ?? process.env.EMAIL_FROM;
  if (!from) {
    return { sent: false, skipped: true, reason: "EMAIL_FROM missing" };
  }

  const { data, error } = await resend.emails.send({
    from,
    to: params.to,
    subject: params.subject,
    html: params.html,
  });

  if (error) {
    throw new Error(`Resend error: ${error.message}`);
  }

  return { sent: true, id: data?.id, provider: "resend" };
}
