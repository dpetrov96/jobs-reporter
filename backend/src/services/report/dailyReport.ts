import type { ScrapeRegionId } from "../../shared/scrapeRegions.js";
import {
  getScrapeRegion,
  isLastScrapeHour,
  regionDateKey,
} from "../../shared/scrapeRegions.js";
import { aggregateDailyCountries } from "./aggregateDaily.js";
import { sendDailyReportEmail } from "./index.js";
import { listJobRunsForRegionDay } from "../runs/index.js";
import type { JobReportMeta } from "./types.js";

function formatDayLabel(dayKey: string, timezone: string): string {
  const [year, month, day] = dayKey.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  return date.toLocaleDateString("en-US", {
    timeZone: timezone,
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export async function maybeSendDailyReport(
  scrapeRegion: ScrapeRegionId,
  fetchedAt: string
): Promise<void> {
  const region = getScrapeRegion(scrapeRegion);
  const runDate = new Date(fetchedAt);

  if (!isLastScrapeHour(runDate, region.timezone, region.workingHours.end)) {
    return;
  }

  const dayKey = regionDateKey(fetchedAt, region.timezone);
  console.log(
    `[daily-report] last scrape of the day for ${region.label} (${dayKey}) — building summary`
  );

  const runs = await listJobRunsForRegionDay(scrapeRegion, dayKey);
  if (runs.length === 0) {
    console.log("[daily-report] no runs found for day — skipping");
    return;
  }

  const countries = aggregateDailyCountries(runs);
  const totalJobs = countries.reduce((sum, country) => sum + country.totalJobs, 0);

  const meta: JobReportMeta = {
    location: region.label,
    fetchedAt,
    postedWithinLabel: "today's scrapes",
    countries,
    countryCount: countries.length,
    reportKind: "daily",
    scrapeRegion,
    dayKey,
    dayLabel: formatDayLabel(dayKey, region.timezone),
    scrapeCount: runs.length,
    timezoneLabel: region.timezoneLabel,
  };

  console.log(
    `[daily-report] ${region.label}: ${runs.length} scrapes, ${totalJobs} unique jobs`
  );

  try {
    const result = await sendDailyReportEmail(meta);
    console.log("[daily-report] email result:", JSON.stringify(result));
  } catch (error) {
    console.error(
      "[daily-report] email failed:",
      error instanceof Error ? error.message : error
    );
  }
}
