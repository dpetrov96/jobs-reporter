import type { ScheduledHandler } from "aws-lambda";
import {
  fetchJobsForCountries,
  resolveJobCountries,
  resolvePostedWithin,
  summarizeCountries,
} from "../services/linkedin/index.js";
import { formatPostedWithinLabel } from "../services/linkedin/sort.js";
import { logJobReport, sendJobReportEmail } from "../services/report/index.js";
import { saveJobRun } from "../services/runs/index.js";

export const handler: ScheduledHandler = async () => {
  const countries = resolveJobCountries();
  const fetchedAt = new Date().toISOString();
  const postedWithin = resolvePostedWithin();
  const postedWithinLabel = formatPostedWithinLabel(postedWithin);
  const location = summarizeCountries(countries);

  console.log(
    `[fetch-jobs] starting multi-country search countries=${countries.length} (${location})`
  );

  const countryResults = await fetchJobsForCountries(countries);
  const meta = {
    location,
    fetchedAt,
    postedWithin,
    postedWithinLabel,
    countries: countryResults,
    countryCount: countryResults.length,
  };
  const totalJobs = countryResults.reduce((sum, country) => sum + country.totalJobs, 0);

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

  console.log(
    `[fetch-jobs] done — ${countryResults.length} countries, ${totalJobs} job(s)`
  );
};
