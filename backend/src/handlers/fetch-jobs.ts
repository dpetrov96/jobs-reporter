import type { ScheduledHandler } from "aws-lambda";
import {
  fetchBulgariaJobsByCategories,
  resolvePostedWithin,
} from "../services/linkedin/index.js";
import { formatPostedWithinLabel } from "../services/linkedin/sort.js";
import { logJobReport, sendJobReportEmail } from "../services/report/index.js";
import { saveJobRun } from "../services/runs/index.js";

export const handler: ScheduledHandler = async () => {
  const location = process.env.JOB_LOCATION ?? "Bulgaria";
  const fetchedAt = new Date().toISOString();
  const postedWithin = resolvePostedWithin();
  const postedWithinLabel = formatPostedWithinLabel(postedWithin);

  console.log(`[fetch-jobs] starting search location="${location}"`);

  const categories = await fetchBulgariaJobsByCategories();
  const meta = { location, fetchedAt, postedWithin, postedWithinLabel, categories };
  const totalJobs = categories.reduce((sum, category) => sum + category.jobs.length, 0);

  logJobReport(meta);

  let emailResult = null;

  try {
    emailResult = await sendJobReportEmail(meta);
    console.log("[fetch-jobs] email result:", JSON.stringify(emailResult));
  } catch (error) {
    console.error(
      "[fetch-jobs] email failed:",
      error instanceof Error ? error.message : error
    );
  }

  try {
    const saveResult = await saveJobRun(meta, emailResult);
    console.log("[fetch-jobs] dynamodb result:", JSON.stringify(saveResult));
  } catch (error) {
    console.error(
      "[fetch-jobs] dynamodb save failed:",
      error instanceof Error ? error.message : error
    );
  }

  console.log(`[fetch-jobs] done — ${categories.length} categories, ${totalJobs} job(s)`);
};
