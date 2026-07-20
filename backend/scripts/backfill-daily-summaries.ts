/**
 * Backfill daily summary reports for every region-day that has hourly scrapes.
 *
 * Usage:
 *   RUNS_TABLE_NAME=dev-linkedin-finder-runs APP_STAGE=dev \
 *     npx tsx scripts/backfill-daily-summaries.ts
 *
 * Options:
 *   --force       Overwrite existing daily summaries
 *   --include-today  Also build today's (possibly incomplete) day
 *   --region=usa|europe  Only one region (repeatable)
 */
import { backfillDailySummaries } from "../src/services/report/backfillDailySummaries.js";
import type { ScrapeRegionId } from "../src/shared/scrapeRegions.js";

const args = process.argv.slice(2);
const force = args.includes("--force");
const skipToday = !args.includes("--include-today");
const regions = args
  .filter((arg) => arg.startsWith("--region="))
  .map((arg) => arg.slice("--region=".length).toLowerCase())
  .filter((id): id is ScrapeRegionId => id === "europe" || id === "usa");

if (!process.env.RUNS_TABLE_NAME) {
  process.env.RUNS_TABLE_NAME = "dev-linkedin-finder-runs";
}
if (!process.env.APP_STAGE) {
  process.env.APP_STAGE = "dev";
}
if (!process.env.AWS_REGION) {
  process.env.AWS_REGION = "eu-central-1";
}

console.log(
  `[backfill] table=${process.env.RUNS_TABLE_NAME} stage=${process.env.APP_STAGE} force=${force} skipToday=${skipToday} regions=${regions.length ? regions.join(",") : "all"}`
);

const result = await backfillDailySummaries({
  force,
  skipToday,
  regions: regions.length ? regions : undefined,
});

console.log(
  JSON.stringify(
    {
      scannedHourly: result.scannedHourly,
      daysFound: result.daysFound,
      saved: result.saved,
      skipped: result.skipped,
    },
    null,
    2
  )
);
