import { fetchLinkedInHtml } from "./fetch.js";
import {
  DEFAULT_JOB_KEYWORDS,
  DEFAULT_JOB_POSTED_WITHIN,
  JOBS_PER_CATEGORY,
  REQUEST_DELAY_MS,
} from "./constants.js";
import {
  type JobCountry,
  resolveJobCountries,
  summarizeCountries,
} from "./countries.js";
import {
  buildLinkedInSearchUrl,
  buildLinkedInJobDetailUrl,
  diagnoseLinkedInSearchHtml,
  LINKEDIN_BULGARIA_GEO_ID,
  LINKEDIN_LOCATION,
  LINKEDIN_PER_PAGE,
  parseLinkedInListingPage,
  parseLinkedInJobDetailPage,
} from "./parser.js";
import { filterJobsWithinPostedWindow, sortJobsByNewest, postedWithinToSeconds } from "./sort.js";
import { countUniqueJobs } from "../../shared/jobCounts.js";
import type { JobCategoryResult, JobListing } from "./types.js";

export type { JobCategoryResult, JobListing };
export type { JobCountry } from "./countries.js";
export { JOB_COUNTRY_REGISTRY, resolveJobCountries, summarizeCountries } from "./countries.js";

export interface FetchJobsOptions {
  keyword?: string;
  keywords?: string[];
  limit?: number;
  location?: string;
  geoId?: string;
  postedWithin?: string;
}

export interface CountryRunResult {
  location: string;
  geoId: string;
  flag: string;
  code: string;
  totalJobs: number;
  categories: JobCategoryResult[];
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function parseJobKeywords(raw?: string): string[] {
  const fallback = DEFAULT_JOB_KEYWORDS.join(",");
  const value = raw?.trim() || fallback;

  return value
    .split(",")
    .map((keyword) => keyword.trim())
    .filter(Boolean);
}

export function resolvePostedWithin(raw?: string): string {
  const value = raw?.trim() || process.env.JOB_POSTED_WITHIN?.trim() || DEFAULT_JOB_POSTED_WITHIN;
  return postedWithinToSeconds(value) ? value : DEFAULT_JOB_POSTED_WITHIN;
}

const DETAIL_ENRICH_CONCURRENCY = 4;

async function enrichJobsFromDetail(jobs: JobListing[]): Promise<JobListing[]> {
  const enriched = [...jobs];

  for (let index = 0; index < enriched.length; index += DETAIL_ENRICH_CONCURRENCY) {
    const batch = enriched.slice(index, index + DETAIL_ENRICH_CONCURRENCY);

    await Promise.all(
      batch.map(async (job, batchIndex) => {
        const targetIndex = index + batchIndex;

        try {
          const html = await fetchLinkedInHtml(buildLinkedInJobDetailUrl(job.id));
          const detail = parseLinkedInJobDetailPage(html);

          enriched[targetIndex] = {
            ...job,
            ...(detail.dateLabel ? { dateLabel: detail.dateLabel } : {}),
            ...(detail.applicantCount != null ? { applicantCount: detail.applicantCount } : {}),
            ...(detail.applicantsLabel ? { applicantsLabel: detail.applicantsLabel } : {}),
          };
        } catch (error) {
          console.warn(`[linkedin] detail enrich failed for ${job.id}:`, error);
        }
      })
    );

    if (index + DETAIL_ENRICH_CONCURRENCY < enriched.length) {
      await sleep(REQUEST_DELAY_MS);
    }
  }

  return enriched;
}

async function fetchKeywordJobs(options: {
  keyword: string;
  limit: number;
  location: string;
  geoId: string;
  postedWithin: string;
}): Promise<JobListing[]> {
  const { keyword, limit, location, geoId, postedWithin } = options;
  const windowSeconds = postedWithinToSeconds(postedWithin) ?? 3600;
  const byId = new Map<string, JobListing>();
  let start = 0;

  while (byId.size < limit) {
    const pageUrl = buildLinkedInSearchUrl({
      keywords: keyword,
      start,
      location,
      geoId,
      sortBy: "DD",
      postedWithin,
    });

    console.log(`[linkedin] search keyword="${keyword}" location="${location}" start=${start}`);

    const html = await fetchLinkedInHtml(pageUrl);
    const diag = diagnoseLinkedInSearchHtml(html);
    console.log(
      `[linkedin] "${keyword}" @ ${location} start=${start}: cards=${diag.jobCards} blocked=${diag.isBlocked}`
    );

    if (diag.isBlocked) {
      throw new Error(
        `LinkedIn blocked guest API for "${keyword}" in ${location}. Try again later or reduce fetch frequency.`
      );
    }

    const pageJobs = parseLinkedInListingPage(html).map((job) => ({
      ...job,
      keyword,
    }));

    for (const job of pageJobs) {
      byId.set(job.id, job);
    }

    if (pageJobs.length < LINKEDIN_PER_PAGE) {
      break;
    }

    start += LINKEDIN_PER_PAGE;
    if (byId.size >= limit) {
      break;
    }

    await sleep(REQUEST_DELAY_MS);
  }

  const filtered = filterJobsWithinPostedWindow([...byId.values()], windowSeconds);
  const sorted = sortJobsByNewest(filtered).slice(0, limit);
  return enrichJobsFromDetail(sorted);
}

export async function fetchJobsByCategories(
  options: FetchJobsOptions = {}
): Promise<JobCategoryResult[]> {
  const keywords = options.keywords ?? parseJobKeywords(process.env.JOB_KEYWORDS);
  const limit = options.limit ?? JOBS_PER_CATEGORY;
  const location = options.location ?? process.env.JOB_LOCATION ?? LINKEDIN_LOCATION;
  const geoId = options.geoId ?? process.env.LINKEDIN_GEO_ID ?? LINKEDIN_BULGARIA_GEO_ID;
  const postedWithin = resolvePostedWithin(options.postedWithin);

  console.log(
    `[linkedin] category search location="${location}" postedWithin=${postedWithin} keywords=${keywords.join(" | ")} limit=${limit}`
  );

  const results: JobCategoryResult[] = [];

  for (const [index, keyword] of keywords.entries()) {
    const jobs = await fetchKeywordJobs({ keyword, limit, location, geoId, postedWithin });
    results.push({ keyword, jobs });
    console.log(`[linkedin] ${location} / "${keyword}": ${jobs.length} job(s)`);

    if (index < keywords.length - 1) {
      await sleep(REQUEST_DELAY_MS);
    }
  }

  return results;
}

export async function fetchJobsForCountries(
  countries: JobCountry[] = resolveJobCountries(),
  options: FetchJobsOptions = {}
): Promise<CountryRunResult[]> {
  const results: CountryRunResult[] = [];

  for (const [index, country] of countries.entries()) {
    const categories = await fetchJobsByCategories({
      ...options,
      location: country.location,
      geoId: country.geoId,
    });

    const totalJobs = countUniqueJobs(categories);
    results.push({
      location: country.location,
      geoId: country.geoId,
      flag: country.flag,
      code: country.code,
      totalJobs,
      categories,
    });

    console.log(`[linkedin] ${country.flag} ${country.location}: ${totalJobs} job(s)`);

    if (index < countries.length - 1) {
      await sleep(REQUEST_DELAY_MS);
    }
  }

  return results;
}

/** @deprecated Use fetchJobsByCategories */
export const fetchBulgariaJobsByCategories = fetchJobsByCategories;

/** @deprecated Use fetchJobsByCategories */
export async function fetchBulgariaJobs(options: FetchJobsOptions = {}): Promise<JobListing[]> {
  const keyword = options.keyword ?? parseJobKeywords(process.env.JOB_KEYWORDS)[0];
  const limit = options.limit ?? LINKEDIN_PER_PAGE;
  const location = options.location ?? process.env.JOB_LOCATION ?? LINKEDIN_LOCATION;
  const geoId = options.geoId ?? process.env.LINKEDIN_GEO_ID ?? LINKEDIN_BULGARIA_GEO_ID;
  const postedWithin = resolvePostedWithin(options.postedWithin);

  const jobs = await fetchKeywordJobs({ keyword, limit, location, geoId, postedWithin });
  console.log(`[linkedin] parsed ${jobs.length} job(s) for "${keyword}" in ${location}`);

  return jobs;
}

export type FetchBulgariaJobsOptions = FetchJobsOptions;
