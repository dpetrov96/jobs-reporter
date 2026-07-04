import { SESv2Client, SendEmailCommand } from "@aws-sdk/client-sesv2";
import type { SendEmailParams, SendEmailResult } from "./types.js";

const client = new SESv2Client({});

export function isSesConfigured(): boolean {
  return Boolean(process.env.EMAIL_FROM);
}

export async function sendViaSes(params: SendEmailParams): Promise<SendEmailResult> {
  const from = params.from ?? process.env.EMAIL_FROM;
  if (!from) {
    return { sent: false, skipped: true, reason: "EMAIL_FROM missing" };
  }

  const recipients = Array.isArray(params.to) ? params.to : [params.to];

  const response = await client.send(
    new SendEmailCommand({
      FromEmailAddress: from,
      Destination: { ToAddresses: recipients },
      Content: {
        Simple: {
          Subject: { Data: params.subject, Charset: "UTF-8" },
          Body: {
            Html: { Data: params.html, Charset: "UTF-8" },
          },
        },
      },
    })
  );

  return { sent: true, id: response.MessageId, provider: "ses" };
}
