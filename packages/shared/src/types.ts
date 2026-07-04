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

export interface JobRunRecord {
  stage: string;
  fetchedAt: string;
  location: string;
  postedWithin: string;
  postedWithinLabel: string;
  totalJobs: number;
  categoryCount: number;
  categories: JobCategoryResult[];
  emailSent: boolean;
  emailSkipped: boolean;
  emailReason?: string;
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
