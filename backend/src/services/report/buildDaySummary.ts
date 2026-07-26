import type { ScrapeRegionId } from "../../shared/scrapeRegions.js";
import { getScrapeRegion } from "../../shared/scrapeRegions.js";
import { aggregateDailyCountries } from "./aggregateDaily.js";
import { formatDayLabel } from "./dailyReport.js";
import { listJobRunsForRegionDay, type JobRunRecord } from "../runs/index.js";

/** Build a live daily summary from hourly scrapes for one region-day. */
export async function buildDaySummaryRun(
  scrapeRegion: ScrapeRegionId,
  dayKey: string
): Promise<JobRunRecord | null> {
  const region = getScrapeRegion(scrapeRegion);
  const hourlyRuns = (await listJobRunsForRegionDay(scrapeRegion, dayKey)).filter(
    (run) => run.reportKind !== "daily"
  );

  if (hourlyRuns.length === 0) {
    return null;
  }

  const countries = aggregateDailyCountries(hourlyRuns);
  const totalJobs = countries.reduce((sum, country) => sum + country.totalJobs, 0);
  const lastFetchedAt = hourlyRuns[hourlyRuns.length - 1]!.fetchedAt;

  return {
    stage: process.env.APP_STAGE ?? "dev",
    fetchedAt: lastFetchedAt,
    location: region.label,
    postedWithin: "",
    postedWithinLabel: "today's scrapes",
    totalJobs,
    countryCount: countries.length,
    categoryCount: countries.reduce((sum, country) => sum + country.categories.length, 0),
    countries,
    emailSent: false,
    emailSkipped: true,
    scrapeRegion,
    reportKind: "daily",
    dayKey,
    dayLabel: formatDayLabel(dayKey, region.timezone),
    scrapeCount: hourlyRuns.length,
  };
}
