export type ScrapeRegionId = "europe" | "usa";

export interface ScrapeRegionConfig {
  id: ScrapeRegionId;
  label: string;
  timezone: string;
  timezoneLabel: string;
  workingHours: { start: number; end: number };
  defaultCountries: string;
}

export const SCRAPE_REGIONS: Record<ScrapeRegionId, ScrapeRegionConfig> = {
  europe: {
    id: "europe",
    label: "Europe",
    timezone: "Europe/Sofia",
    timezoneLabel: "Sofia",
    workingHours: { start: 9, end: 23 },
    defaultCountries: "BG,FR,DE,NL,GB,BE,PL",
  },
  usa: {
    id: "usa",
    label: "United States",
    timezone: "America/Los_Angeles",
    timezoneLabel: "LA",
    workingHours: { start: 9, end: 23 },
    defaultCountries: "US",
  },
};

export function getScrapeRegion(id: ScrapeRegionId): ScrapeRegionConfig {
  return SCRAPE_REGIONS[id];
}

export function resolveScrapeRegionId(raw?: string): ScrapeRegionId {
  const value = raw?.trim().toLowerCase();
  if (value === "usa" || value === "us") return "usa";
  return "europe";
}

export function resolveScrapeRegion(): ScrapeRegionConfig {
  const fromEnv =
    typeof process !== "undefined" ? process.env.SCRAPE_REGION : undefined;
  return getScrapeRegion(resolveScrapeRegionId(fromEnv));
}

export function regionDateKey(isoOrDate: string | Date, timezone: string): string {
  const date = typeof isoOrDate === "string" ? new Date(isoOrDate) : isoOrDate;
  return new Intl.DateTimeFormat("en-CA", { timeZone: timezone }).format(date);
}

export function getRegionHour(date: Date, timezone: string): number {
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    hour: "numeric",
    hour12: false,
  });
  return Number(formatter.format(date));
}

export function isLastScrapeHour(
  date: Date,
  timezone: string,
  endHour: number
): boolean {
  return getRegionHour(date, timezone) === endHour;
}

/** UTC ISO bounds for a calendar day in the given IANA timezone. */
export function getDayUtcBounds(
  dayKey: string,
  timezone: string
): { start: string; end: string } {
  const localKey = (ms: number) => regionDateKey(new Date(ms), timezone);

  let lo = Date.parse(`${dayKey}T00:00:00.000Z`) - 36 * 3600_000;
  let hi = Date.parse(`${dayKey}T00:00:00.000Z`) + 36 * 3600_000;

  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (localKey(mid) < dayKey) lo = mid + 1;
    else hi = mid;
  }

  const startMs = lo;
  let lo2 = startMs;
  let hi2 = startMs + 48 * 3600_000;

  const nextDayMs = startMs + 24 * 3600_000;
  const nextKey = localKey(nextDayMs);

  while (lo2 < hi2) {
    const mid = Math.floor((lo2 + hi2) / 2);
    if (localKey(mid) < nextKey) lo2 = mid + 1;
    else hi2 = mid;
  }

  return {
    start: new Date(startMs).toISOString(),
    end: new Date(lo2 - 1).toISOString(),
  };
}
