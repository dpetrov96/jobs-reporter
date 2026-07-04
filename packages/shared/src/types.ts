import { enrichCountryRun, getCountryFlag, lookupCountry } from "./countries.js";

export interface JobListing {
  id: string;
  linkedInJobId: string;
  title: string;
  company: string;
  url: string;
  location?: string;
  workMode?: "remote" | "hybrid" | "onsite";
  datePosted?: string;
  dateLabel?: string;
  keyword?: string;
  companyLogoUrl?: string;
}

export interface JobCategoryResult {
  keyword: string;
  jobs: JobListing[];
}

export interface CountryRunResult {
  location: string;
  geoId: string;
  flag: string;
  code: string;
  totalJobs: number;
  categories: JobCategoryResult[];
}

export interface JobRunRecord {
  stage: string;
  fetchedAt: string;
  location: string;
  postedWithin: string;
  postedWithinLabel: string;
  totalJobs: number;
  countryCount: number;
  categoryCount: number;
  countries: CountryRunResult[];
  emailSent: boolean;
  emailSkipped: boolean;
  emailReason?: string;
  /** @deprecated Legacy single-country runs */
  categories?: JobCategoryResult[];
}

export interface FetchRunsOptions {
  limit?: number;
  cursor?: string;
}

export interface ListRunsResponse {
  ok: boolean;
  count: number;
  runs: JobRunRecord[];
  nextCursor?: string;
  error?: string;
}

export interface GetRunResponse {
  ok: boolean;
  run?: JobRunRecord;
  error?: string;
}

export const DEFAULT_API_URL =
  "https://z8q1cuu3g3.execute-api.eu-central-1.amazonaws.com";

export function workModeLabel(workMode?: string): string {
  if (!workMode) return "";
  if (workMode === "remote") return "Remote";
  if (workMode === "hybrid") return "Hybrid";
  return "On-site";
}

export function formatRunDate(iso: string): string {
  return new Date(iso).toLocaleString();
}

export function encodeRunId(fetchedAt: string): string {
  return encodeURIComponent(fetchedAt);
}

export function normalizeRun(run: JobRunRecord): JobRunRecord {
  if (run.countries?.length) {
    return {
      ...run,
      countryCount: run.countryCount ?? run.countries.length,
      categoryCount:
        run.categoryCount ??
        run.countries.reduce((sum, country) => sum + country.categories.length, 0),
      countries: run.countries.map((country) => enrichCountryRun(country)),
    };
  }

  const legacyCategories = run.categories ?? [];
  const totalJobs =
    run.totalJobs ?? legacyCategories.reduce((sum, category) => sum + category.jobs.length, 0);
  const legacyCountry = lookupCountry(run.location);
  const code = legacyCountry?.code ?? run.location.slice(0, 2).toUpperCase();

  return {
    ...run,
    totalJobs,
    countryCount: 1,
    categoryCount: legacyCategories.length,
    countries: [
      enrichCountryRun({
        location: run.location,
        geoId: legacyCountry?.geoId ?? "",
        flag: getCountryFlag(code, run.location),
        code,
        totalJobs,
        categories: legacyCategories,
      }),
    ],
  };
}

export function countActiveCountries(run: JobRunRecord): number {
  const normalized = normalizeRun(run);
  return normalized.countries.filter((country) => country.totalJobs > 0).length;
}
