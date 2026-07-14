import type { JobCategoryResult } from "../linkedin/types.js";
import type { ScrapeRegionId } from "../../shared/scrapeRegions.js";

export type ReportKind = "hourly" | "daily";

export interface CountryRunResult {
  location: string;
  geoId: string;
  flag: string;
  code: string;
  totalJobs: number;
  categories: JobCategoryResult[];
}

export interface JobReportMeta {
  location: string;
  fetchedAt?: string;
  postedWithin?: string;
  postedWithinLabel?: string;
  countries: CountryRunResult[];
  countryCount?: number;
  reportKind?: ReportKind;
  scrapeRegion?: ScrapeRegionId;
  dayKey?: string;
  dayLabel?: string;
  scrapeCount?: number;
  timezoneLabel?: string;
}
