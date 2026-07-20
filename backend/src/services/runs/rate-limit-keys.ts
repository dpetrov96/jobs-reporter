import type { ScrapeRegionId } from "./scrapeRegions.js";

export function manualTriggerRateLimitSk(region: ScrapeRegionId): string {
  if (region === "usa") return "__manual_trigger_rate_limit_usa__";
  return "__manual_trigger_rate_limit__";
}

export function isRateLimitRecord(fetchedAt: string, recordType?: string): boolean {
  return (
    fetchedAt === "__manual_trigger_rate_limit__" ||
    fetchedAt === "__manual_trigger_rate_limit_usa__" ||
    fetchedAt === "__manual_trigger_rate_limit_europe__" ||
    recordType === "manual_trigger_rate_limit"
  );
}
