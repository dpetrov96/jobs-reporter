import { fetchLinkedInHtml } from "./fetch.js";
import {
  DEFAULT_JOB_KEYWORDS,
  DEFAULT_JOB_POSTED_WITHIN,
  JOBS_PER_CATEGORY,
  REQUEST_DELAY_MS,
} from "./constants.js";
import {
  buildLinkedInSearchUrl,
  diagnoseLinkedInSearchHtml,
  LINKEDIN_BULGARIA_GEO_ID,
  LINKEDIN_LOCATION,
  LINKEDIN_PER_PAGE,
  parseLinkedInListingPage,
} from "./parser.js";
import { filterJobsWithinPostedWindow, sortJobsByNewest, postedWithinToSeconds } from "./sort.js";
import type { JobCategoryResult, JobListing } from "./types.js";

export type { JobCategoryResult, JobListing };

export interface FetchBulgariaJobsOptions {
  keyword?: string;
  keywords?: string[];
  limit?: number;
  location?: string;
  geoId?: string;
  postedWithin?: string;
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

    console.log(`[linkedin] search keyword="${keyword}" start=${start}`);

    const html = await fetchLinkedInHtml(pageUrl);
    const diag = diagnoseLinkedInSearchHtml(html);
    console.log(
      `[linkedin] "${keyword}" page start=${start}: cards=${diag.jobCards} blocked=${diag.isBlocked}`
    );

    if (diag.isBlocked) {
      throw new Error(
        `LinkedIn blocked guest API for "${keyword}". Try again later or reduce fetch frequency.`
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
  return sortJobsByNewest(filtered).slice(0, limit);
}

export async function fetchBulgariaJobs(
  options: FetchBulgariaJobsOptions = {}
): Promise<JobListing[]> {
  const keyword = options.keyword ?? parseJobKeywords(process.env.JOB_KEYWORDS)[0];
  const limit = options.limit ?? LINKEDIN_PER_PAGE;
  const location = options.location ?? process.env.JOB_LOCATION ?? LINKEDIN_LOCATION;
  const geoId = options.geoId ?? process.env.LINKEDIN_GEO_ID ?? LINKEDIN_BULGARIA_GEO_ID;
  const postedWithin = resolvePostedWithin(options.postedWithin);

  console.log(`[linkedin] single search keyword="${keyword}" location="${location}" geoId=${geoId}`);

  const jobs = await fetchKeywordJobs({ keyword, limit, location, geoId, postedWithin });
  console.log(`[linkedin] parsed ${jobs.length} job(s) for "${keyword}"`);

  return jobs;
}

export async function fetchBulgariaJobsByCategories(
  options: FetchBulgariaJobsOptions = {}
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
    console.log(`[linkedin] category "${keyword}": ${jobs.length} newest job(s)`);

    if (index < keywords.length - 1) {
      await sleep(REQUEST_DELAY_MS);
    }
  }

  return results;
}
