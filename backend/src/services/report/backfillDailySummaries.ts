import type { ScrapeRegionId } from "../../shared/scrapeRegions.js";
import { getScrapeRegion, regionDateKey } from "../../shared/scrapeRegions.js";
import { listJobRuns, listJobRunsForRegionDay, type JobRunRecord } from "../runs/index.js";
import {
  saveDailySummaryForDay,
  type SaveDailySummaryResult,
} from "./dailyReport.js";

const REGIONS: ScrapeRegionId[] = ["europe", "usa"];

export type BackfillDailySummariesOptions = {
  /** Rebuild even when a daily summary already exists. Default false. */
  force?: boolean;
  /** Limit to these regions. Default both. */
  regions?: ScrapeRegionId[];
  /** Skip the current local calendar day (partial day). Default true. */
  skipToday?: boolean;
};

export type BackfillDailySummariesResult = {
  scannedHourly: number;
  daysFound: number;
  saved: number;
  skipped: number;
  results: SaveDailySummaryResult[];
};

async function listAllHourlyRuns(): Promise<JobRunRecord[]> {
  const all: JobRunRecord[] = [];
  let cursor: string | undefined;

  do {
    const page = await listJobRuns(50, cursor);
    for (const run of page.runs) {
      if (run.reportKind === "daily") continue;
      all.push(run);
    }
    cursor = page.nextCursor;
  } while (cursor);

  return all;
}

function collectDayKeysByRegion(
  runs: JobRunRecord[],
  regions: ScrapeRegionId[],
  skipToday: boolean
): Map<ScrapeRegionId, Set<string>> {
  const byRegion = new Map<ScrapeRegionId, Set<string>>();
  for (const regionId of regions) {
    byRegion.set(regionId, new Set());
  }

  const todayByRegion = new Map<ScrapeRegionId, string>();
  if (skipToday) {
    const now = new Date();
    for (const regionId of regions) {
      const region = getScrapeRegion(regionId);
      todayByRegion.set(regionId, regionDateKey(now, region.timezone));
    }
  }

  for (const run of runs) {
    const regionId = (run.scrapeRegion ?? "europe") as ScrapeRegionId;
    const days = byRegion.get(regionId);
    if (!days) continue;

    const region = getScrapeRegion(regionId);
    const dayKey = regionDateKey(run.fetchedAt, region.timezone);
    if (skipToday && todayByRegion.get(regionId) === dayKey) continue;
    days.add(dayKey);
  }

  return byRegion;
}

/**
 * Scan all hourly scrapes and persist a daily summary for each region-day
 * that has data. Skips days that already have a daily record unless force.
 */
export async function backfillDailySummaries(
  options: BackfillDailySummariesOptions = {}
): Promise<BackfillDailySummariesResult> {
  const regions = options.regions ?? REGIONS;
  const force = options.force === true;
  const skipToday = options.skipToday !== false;

  const hourlyRuns = await listAllHourlyRuns();
  const dayKeysByRegion = collectDayKeysByRegion(hourlyRuns, regions, skipToday);

  const results: SaveDailySummaryResult[] = [];
  let saved = 0;
  let skipped = 0;
  let daysFound = 0;

  for (const regionId of regions) {
    const dayKeys = [...(dayKeysByRegion.get(regionId) ?? [])].sort();
    daysFound += dayKeys.length;

    for (const dayKey of dayKeys) {
      const dayHourlies = hourlyRuns.filter((run) => {
        const runRegion = (run.scrapeRegion ?? "europe") as ScrapeRegionId;
        if (runRegion !== regionId) return false;
        const region = getScrapeRegion(regionId);
        return regionDateKey(run.fetchedAt, region.timezone) === dayKey;
      });

      if (!force) {
        const existing = await listJobRunsForRegionDay(regionId, dayKey);
        if (existing.some((run) => run.reportKind === "daily")) {
          skipped += 1;
          results.push({
            saved: false,
            skipped: true,
            dayKey,
            scrapeRegion: regionId,
            reason: "daily_already_exists",
          });
          console.log(`[backfill] skip ${regionId} ${dayKey} — already exists`);
          continue;
        }
      }

      console.log(
        `[backfill] ${regionId} ${dayKey} — ${dayHourlies.length} hourly run(s)`
      );
      try {
        const result = await saveDailySummaryForDay(regionId, dayKey, {
          sendEmail: false,
          hourlyRuns: dayHourlies,
        });
        results.push(result);

        if (result.saved) {
          saved += 1;
          console.log(
            `[backfill] saved ${regionId} ${dayKey} — ${result.totalJobs} jobs from ${result.scrapeCount} scrapes`
          );
        } else {
          skipped += 1;
          console.log(`[backfill] skipped ${regionId} ${dayKey}: ${result.reason}`);
        }
      } catch (error) {
        skipped += 1;
        const reason = error instanceof Error ? error.message : String(error);
        results.push({
          saved: false,
          skipped: true,
          dayKey,
          scrapeRegion: regionId,
          reason,
        });
        console.error(`[backfill] error ${regionId} ${dayKey}: ${reason}`);
      }
    }
  }

  return {
    scannedHourly: hourlyRuns.length,
    daysFound,
    saved,
    skipped,
    results,
  };
}
