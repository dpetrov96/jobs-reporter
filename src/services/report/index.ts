import { isEmailConfigured, sendEmail } from "../email/index.js";
import type { SendEmailResult } from "../email/types.js";
import { buildJobReportHtml } from "./template.js";
import type { JobReportMeta } from "./types.js";

export type { JobReportMeta } from "./types.js";

export function logJobReport(meta: JobReportMeta): void {
  const fetchedAt = meta.fetchedAt ?? new Date().toISOString();
  const totalJobs = meta.categories.reduce((sum, category) => sum + category.jobs.length, 0);

  console.log("=== Job Report ===");
  console.log(`Time: ${fetchedAt}`);
  console.log(`Location: ${meta.location}`);
  console.log(`Categories: ${meta.categories.length}`);
  console.log(`Total jobs: ${totalJobs}`);
  console.log("---");

  for (const category of meta.categories) {
    console.log(`## ${category.keyword} (${category.jobs.length})`);

    if (category.jobs.length === 0) {
      const period = meta.postedWithinLabel ?? "the selected period";
      console.log(`No jobs in ${period}.`);
      continue;
    }

    for (const [index, job] of category.jobs.entries()) {
      const location = job.location ?? "—";
      const workMode = job.workMode ? ` (${job.workMode})` : "";
      const date = job.dateLabel ?? job.datePosted ?? "—";

      console.log(
        `${index + 1}. ${job.title} @ ${job.company} — ${location}${workMode} — ${date}`
      );
      console.log(`   ${job.url}`);
    }
  }

  console.log("=== End Report ===");
}

export async function sendJobReportEmail(meta: JobReportMeta): Promise<SendEmailResult> {
  const reportTo = process.env.REPORT_EMAIL_TO;

  if (!reportTo) {
    return {
      sent: false,
      skipped: true,
      reason: "REPORT_EMAIL_TO missing — set it in env or template parameters",
    };
  }

  if (!isEmailConfigured()) {
    return {
      sent: false,
      skipped: true,
      reason: "Email not configured — set RESEND_API_KEY or SES",
    };
  }

  const stage = process.env.APP_STAGE ?? "dev";
  const totalJobs = meta.categories.reduce((sum, category) => sum + category.jobs.length, 0);
  const subject = `[${stage}] LinkedIn jobs — ${meta.categories.length} categories (${totalJobs})`;

  return sendEmail({
    to: reportTo,
    subject,
    html: buildJobReportHtml(meta),
  });
}
