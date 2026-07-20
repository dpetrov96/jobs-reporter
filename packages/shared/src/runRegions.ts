import type { JobRunRecord } from "./types.js";
import type { ScrapeRegionId } from "./scrapeRegions.js";
import { getScrapeRegion } from "./scrapeRegions.js";

export const SCRAPE_REGION_ORDER: ScrapeRegionId[] = ["europe", "usa"];

export function getRunScrapeRegion(run: JobRunRecord): ScrapeRegionId {
  return run.scrapeRegion ?? "europe";
}

export function filterRunsByRegion(
  runs: JobRunRecord[],
  regionId: ScrapeRegionId
): JobRunRecord[] {
  return runs.filter((run) => getRunScrapeRegion(run) === regionId);
}

export function findLatestRunForRegion(
  runs: JobRunRecord[],
  regionId: ScrapeRegionId
): JobRunRecord | null {
  return filterRunsByRegion(runs, regionId)[0] ?? null;
}

export function getScrapeRegionLabel(regionId: ScrapeRegionId): string {
  return getScrapeRegion(regionId).label;
}

export function listScrapeRegionOptions(): Array<{
  id: ScrapeRegionId;
  label: string;
  timezoneLabel: string;
  flag: string;
}> {
  return SCRAPE_REGION_ORDER.map((id) => ({
    id,
    label: getScrapeRegion(id).label,
    timezoneLabel: getScrapeRegion(id).timezoneLabel,
    flag: id === "usa" ? "🇺🇸" : "🇪🇺",
  }));
}
