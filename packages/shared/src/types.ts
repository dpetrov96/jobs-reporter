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

export type ReportKind = "hourly" | "daily";

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
  /** Absent or "hourly" for scrape runs; "daily" for end-of-day summaries. */
  reportKind?: ReportKind;
  dayKey?: string;
  dayLabel?: string;
  scrapeCount?: number;
  /** @deprecated Legacy single-country runs */
  categories?: JobCategoryResult[];
}

export function isDailySummaryRun(run: Pick<JobRunRecord, "reportKind">): boolean {
  return run.reportKind === "daily";
}

export function isHourlyRun(run: Pick<JobRunRecord, "reportKind">): boolean {
  return run.reportKind !== "daily";
}

export type RunReportKindFilter = "all" | "hourly" | "daily";

export interface FetchRunsOptions {
  limit?: number;
  cursor?: string;
  scrapeRegion?: "europe" | "usa";
  /** Filter by report kind. Default "all". */
  reportKind?: RunReportKindFilter;
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
export const MANUAL_TRIGGER_RATE_LIMIT_US_SK = "__manual_trigger_rate_limit_usa__";

export function isJobRunRecord(run: unknown): run is JobRunRecord {
  if (!run || typeof run !== "object") return false;

  const record = run as Partial<JobRunRecord> & { recordType?: string };
  if (typeof record.fetchedAt !== "string") return false;
  if (record.fetchedAt === MANUAL_TRIGGER_RATE_LIMIT_SK) return false;
  if (record.fetchedAt === MANUAL_TRIGGER_RATE_LIMIT_US_SK) return false;
  if (record.recordType === "manual_trigger_rate_limit") return false;
  if (Number.isNaN(Date.parse(record.fetchedAt))) return false;

  if (Array.isArray(record.countries) && record.countries.length > 0) return true;
  if (Array.isArray(record.categories)) return true;
  if (typeof record.totalJobs === "number") return true;

  return false;
}

export function normalizeRun(run: JobRunRecord): JobRunRecord {
  if (run.countries?.length) {
    const countries = sortByCountryDisplayOrder(
      run.countries.map((country) => {
        const categories = country.categories ?? [];
        const totalJobs =
          categories.length > 0
            ? countUniqueJobs(categories)
            : (country.totalJobs ?? 0);
        return enrichCountryRun({
          ...country,
          categories,
          totalJobs,
        });
      }),
    );

    return {
      ...run,
      totalJobs:
        run.totalJobs ??
        countries.reduce((sum, country) => sum + country.totalJobs, 0),
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
