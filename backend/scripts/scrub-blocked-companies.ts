/**
 * Remove blocked-company job listings from all stored runs.
 *
 * Usage:
 *   RUNS_TABLE_NAME=dev-linkedin-finder-runs APP_STAGE=dev \
 *     npx tsx scripts/scrub-blocked-companies.ts
 */
import { BLOCKED_COMPANIES } from "../src/shared/companyBlocklist.js";
import { scrubBlockedCompaniesFromRuns } from "../src/services/report/scrubBlockedCompanies.js";

if (!process.env.RUNS_TABLE_NAME) {
  process.env.RUNS_TABLE_NAME = "dev-linkedin-finder-runs";
}
if (!process.env.APP_STAGE) {
  process.env.APP_STAGE = "dev";
}
if (!process.env.AWS_REGION) {
  process.env.AWS_REGION = "eu-central-1";
}

console.log(`[scrub] blocked companies: ${BLOCKED_COMPANIES.join(", ")}`);
console.log(
  `[scrub] table=${process.env.RUNS_TABLE_NAME} stage=${process.env.APP_STAGE}`
);

const result = await scrubBlockedCompaniesFromRuns();
console.log(JSON.stringify(result, null, 2));
