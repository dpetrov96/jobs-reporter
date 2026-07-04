import type { JobCategoryResult } from "../linkedin/types.js";

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
}
