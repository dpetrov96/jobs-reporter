import type { JobListing } from "../services/linkedin/types.js";

/** Companies whose job listings are ignored in scrapes and cleaned from stored runs. */
export const BLOCKED_COMPANIES = [
  "Quik Hire Staffing",
  "Hire Feed",
  "Proxify",
  "Haystack",
  "DataAnnotation",
  "Jack & Jill",
  "Jobgether",
  "Turing",
  "FetchJobs.co",
  "Jobright.ai",
  "RemoteHunter",
  "Owen Thomas",
  "hackajob",
  "Crossing Hurdles",
  "VirtueTech Recruitment Group",
] as const;

function normalizeCompanyName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[™®©]/g, "")
    .replace(/\s+/g, " ");
}

const BLOCKED_KEYS = BLOCKED_COMPANIES.map(normalizeCompanyName);

export function isBlockedCompany(company: string | undefined): boolean {
  if (!company) return false;
  const key = normalizeCompanyName(company);
  if (!key) return false;
  return BLOCKED_KEYS.some((blocked) => key === blocked || key.includes(blocked));
}

export function filterBlockedCompanies<T extends Pick<JobListing, "company">>(
  jobs: T[]
): T[] {
  return jobs.filter((job) => !isBlockedCompany(job.company));
}
