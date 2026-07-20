import { gzipSync, gunzipSync } from "node:zlib";
import type { CountryRunResult } from "./types.js";
import type { JobListing } from "../linkedin/types.js";

function slimJob(job: JobListing, mode: "standard" | "compact"): JobListing {
  if (mode === "compact") {
    return {
      id: job.id,
      linkedInJobId: job.linkedInJobId,
      title: job.title,
      company: job.company,
      url: job.url,
      location: job.location,
      workMode: job.workMode,
      keyword: job.keyword,
    };
  }

  return {
    id: job.id,
    linkedInJobId: job.linkedInJobId,
    title: job.title,
    company: job.company,
    url: job.url,
    location: job.location,
    workMode: job.workMode,
    datePosted: job.datePosted,
    dateLabel: job.dateLabel,
    applicantCount: job.applicantCount,
    applicantsLabel: job.applicantsLabel,
    keyword: job.keyword,
  };
}

/** Strip heavy fields so daily aggregates fit in a DynamoDB item. */
export function slimDailyCountries(
  countries: CountryRunResult[],
  mode: "standard" | "compact" = "standard"
): CountryRunResult[] {
  return countries.map((country) => ({
    ...country,
    categories: (country.categories ?? []).map((category) => ({
      keyword: category.keyword,
      jobs: (category.jobs ?? []).map((job) => slimJob(job, mode)),
    })),
  }));
}

/** Country shells with counts only — used when full job lists are gzipped. */
export function countryStubs(countries: CountryRunResult[]): CountryRunResult[] {
  return countries.map((country) => ({
    location: country.location,
    geoId: country.geoId,
    flag: country.flag,
    code: country.code,
    totalJobs: country.totalJobs,
    categories: [],
  }));
}

export function gzipCountries(countries: CountryRunResult[]): Uint8Array {
  return gzipSync(Buffer.from(JSON.stringify(countries), "utf8"));
}

export function gunzipCountries(payload: Uint8Array | Buffer | string): CountryRunResult[] {
  const buffer =
    typeof payload === "string"
      ? Buffer.from(payload, "base64")
      : Buffer.from(payload);
  const json = gunzipSync(buffer).toString("utf8");
  const parsed = JSON.parse(json) as CountryRunResult[];
  return Array.isArray(parsed) ? parsed : [];
}

export function isDynamoItemTooLarge(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const message = "message" in error ? String(error.message) : "";
  const name = "name" in error ? String(error.name) : "";
  return (
    name === "ValidationException" ||
    message.includes("Item size has exceeded the maximum allowed size")
  );
}
