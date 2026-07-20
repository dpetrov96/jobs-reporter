import type { ScrapeRegionId } from "../../shared/scrapeRegions.js";
import {
  getDayUtcBounds,
  getScrapeRegion,
  isLastScrapeHour,
  regionDateKey,
} from "../../shared/scrapeRegions.js";
import { aggregateDailyCountries } from "./aggregateDaily.js";
import { sendDailyReportEmail } from "./index.js";
import {
  listJobRunsForRegionDay,
  saveJobRun,
  type JobRunRecord,
} from "../runs/index.js";
import type { CountryRunResult, JobReportMeta } from "./types.js";
import type { SendEmailResult } from "../email/types.js";
import {
  countryStubs,
  gzipCountries,
  isDynamoItemTooLarge,
  slimDailyCountries,
} from "./slimDailyCountries.js";

export function formatDayLabel(dayKey: string, timezone: string): string {
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

export type SaveDailySummaryOptions = {
  /** When true, send the daily summary email. Default false (persist only). */
  sendEmail?: boolean;
  /** Pre-loaded hourly runs for the day (skips DynamoDB day query). */
  hourlyRuns?: JobRunRecord[];
};

export type SaveDailySummaryResult =
  | {
      saved: true;
      dayKey: string;
      scrapeRegion: ScrapeRegionId;
      scrapeCount: number;
      totalJobs: number;
      fetchedAt: string;
      emailSent: boolean;
    }
  | {
      saved: false;
      skipped: true;
      dayKey: string;
      scrapeRegion: ScrapeRegionId;
      reason: string;
    };

type PersistVariant =
  | { kind: "inline"; countries: CountryRunResult[] }
  | { kind: "gzip"; countries: CountryRunResult[]; countriesGzip: Uint8Array };

function buildPersistVariants(countries: CountryRunResult[]): PersistVariant[] {
  const standard = slimDailyCountries(countries, "standard");
  const compact = slimDailyCountries(countries, "compact");
  return [
    { kind: "inline", countries: standard },
    { kind: "inline", countries: compact },
    {
      kind: "gzip",
      countries: countryStubs(compact),
      countriesGzip: gzipCountries(compact),
    },
  ];
}

/** Build and persist a daily summary for one region-day. Does not email unless sendEmail. */
export async function saveDailySummaryForDay(
  scrapeRegion: ScrapeRegionId,
  dayKey: string,
  options: SaveDailySummaryOptions = {}
): Promise<SaveDailySummaryResult> {
  const region = getScrapeRegion(scrapeRegion);
  const sendEmail = options.sendEmail === true;

  const dayRuns =
    options.hourlyRuns ?? (await listJobRunsForRegionDay(scrapeRegion, dayKey));
  const hourlyRuns = dayRuns.filter((run) => run.reportKind !== "daily");

  if (hourlyRuns.length === 0) {
    return {
      saved: false,
      skipped: true,
      dayKey,
      scrapeRegion,
      reason: "no_hourly_runs",
    };
  }

  const countries = aggregateDailyCountries(hourlyRuns);
  const totalJobs = countries.reduce((sum, country) => sum + country.totalJobs, 0);
  const dayLabel = formatDayLabel(dayKey, region.timezone);
  const { end: dailyFetchedAt } = getDayUtcBounds(dayKey, region.timezone);

  const meta: JobReportMeta = {
    location: region.label,
    fetchedAt: dailyFetchedAt,
    postedWithinLabel: "today's scrapes",
    countries,
    countryCount: countries.length,
    reportKind: "daily",
    scrapeRegion,
    dayKey,
    dayLabel,
    scrapeCount: hourlyRuns.length,
    timezoneLabel: region.timezoneLabel,
  };

  let emailResult: SendEmailResult | null = {
    sent: false,
    skipped: true,
    reason: sendEmail ? "email_not_attempted" : "backfill_no_email",
  };

  if (sendEmail) {
    try {
      emailResult = await sendDailyReportEmail(meta);
    } catch (error) {
      console.error(
        `[daily-report] email failed for ${scrapeRegion} ${dayKey}:`,
        error instanceof Error ? error.message : error
      );
      emailResult = null;
    }
  }

  const variants = buildPersistVariants(countries);
  let lastError: unknown;

  for (const variant of variants) {
    try {
      const saveResult = await saveJobRun(
        {
          location: region.label,
          fetchedAt: dailyFetchedAt,
          postedWithinLabel: "today's scrapes",
          countries: variant.countries,
          countryCount: countries.length,
          scrapeRegion,
          reportKind: "daily",
          dayKey,
          dayLabel,
          scrapeCount: hourlyRuns.length,
          ...(variant.kind === "gzip" ? { countriesGzip: variant.countriesGzip } : {}),
        },
        emailResult
      );

      if (!saveResult.saved) {
        return {
          saved: false,
          skipped: true,
          dayKey,
          scrapeRegion,
          reason: saveResult.reason,
        };
      }

      if (variant.kind === "gzip") {
        console.log(
          `[daily-report] saved ${scrapeRegion} ${dayKey} with gzipped job lists (${variant.countriesGzip.byteLength} bytes)`
        );
      }

      return {
        saved: true,
        dayKey,
        scrapeRegion,
        scrapeCount: hourlyRuns.length,
        totalJobs,
        fetchedAt: dailyFetchedAt,
        emailSent: emailResult?.sent === true,
      };
    } catch (error) {
      lastError = error;
      if (!isDynamoItemTooLarge(error)) throw error;
      console.warn(
        `[daily-report] ${scrapeRegion} ${dayKey} too large (${variant.kind}) — retrying`
      );
    }
  }

  return {
    saved: false,
    skipped: true,
    dayKey,
    scrapeRegion,
    reason:
      lastError instanceof Error
        ? `item_too_large: ${lastError.message}`
        : "item_too_large",
  };
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

  const result = await saveDailySummaryForDay(scrapeRegion, dayKey, {
    sendEmail: true,
  });

  if (!result.saved) {
    console.log(`[daily-report] skipped: ${result.reason}`);
    return;
  }

  console.log(
    `[daily-report] ${region.label}: ${result.scrapeCount} scrapes, ${result.totalJobs} unique jobs — saved ${result.fetchedAt}`
  );
}
