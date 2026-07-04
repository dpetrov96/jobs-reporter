export type EmailProvider = "resend" | "ses";

export type SendEmailParams = {
  to: string | string[];
  subject: string;
  html: string;
  from?: string;
};

export type SendEmailResult =
  | { sent: true; id?: string; provider: EmailProvider }
  | { sent: false; skipped: true; reason: string };
