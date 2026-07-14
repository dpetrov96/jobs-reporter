import { enrichCountryRun, getCountryFlag, lookupCountry, sortByCountryDisplayOrder } from "./countries.js";
import { countUniqueJobs } from "./jobCounts.js";

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
  applicantCount?: number;
  applicantsLabel?: string;
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
  scrapeRegion?: "europe" | "usa";
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

export interface TriggerFetchStatusResponse {
  ok: boolean;
  canTrigger: boolean;
  retryAfterSeconds: number;
  lastManualTriggeredAt?: string;
  lastRunAt?: string;
  cooldownMinutes: number;
  minRunGapMinutes: number;
  reason?: string;
  error?: string;
}

export interface TriggerFetchResponse {
  ok: boolean;
  message?: string;
  error?: string;
  retryAfterSeconds?: number;
  cooldownMinutes?: number;
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

export const MANUAL_TRIGGER_RATE_LIMIT_SK = "__manual_trigger_rate_limit__";

export function isJobRunRecord(run: unknown): run is JobRunRecord {
  if (!run || typeof run !== "object") return false;

  const record = run as Partial<JobRunRecord> & { recordType?: string };
  if (typeof record.fetchedAt !== "string") return false;
  if (record.fetchedAt === MANUAL_TRIGGER_RATE_LIMIT_SK) return false;
  if (record.recordType === "manual_trigger_rate_limit") return false;
  if (Number.isNaN(Date.parse(record.fetchedAt))) return false;

  if (Array.isArray(record.countries) && record.countries.length > 0) return true;
  if (Array.isArray(record.categories)) return true;

  return false;
}

export function normalizeRun(run: JobRunRecord): JobRunRecord {
  if (run.countries?.length) {
    const countries = sortByCountryDisplayOrder(
      run.countries.map((country) => {
        const categories = country.categories ?? [];
        return enrichCountryRun({
          ...country,
          categories,
          totalJobs: countUniqueJobs(categories),
        });
      }),
    );

    return {
      ...run,
      totalJobs: countries.reduce((sum, country) => sum + country.totalJobs, 0),
      countryCount: run.countryCount ?? countries.length,
      categoryCount:
        run.categoryCount ??
        countries.reduce((sum, country) => sum + (country.categories?.length ?? 0), 0),
      countries,
    };
  }

  const legacyCategories = run.categories ?? [];
  const totalJobs = countUniqueJobs(legacyCategories);
  const legacyCountry = lookupCountry(run.location);
  const code = legacyCountry?.code ?? run.location?.slice(0, 2).toUpperCase() ?? "XX";
  const location = run.location ?? legacyCountry?.location ?? "Unknown";

  return {
    ...run,
    totalJobs,
    countryCount: 1,
    categoryCount: legacyCategories.length,
    countries: [
      enrichCountryRun({
        location,
        geoId: legacyCountry?.geoId ?? "",
        flag: getCountryFlag(code, location),
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
