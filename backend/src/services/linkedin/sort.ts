import type { JobListing } from "./types.js";
import { jobPostedAtMs } from "./jobTime.js";

export { jobPostedAtMs } from "./jobTime.js";

export function sortJobsByNewest(jobs: JobListing[]): JobListing[] {
  return [...jobs].sort((a, b) => jobPostedAtMs(b) - jobPostedAtMs(a));
}

export function postedWithinToSeconds(value: string): number | undefined {
  const match = value.trim().match(/^r(\d+)$/i);
  if (!match) return undefined;
  const seconds = Number(match[1]);
  return Number.isFinite(seconds) && seconds > 0 ? seconds : undefined;
}

export function formatPostedWithinLabel(value: string): string {
  const seconds = postedWithinToSeconds(value);
  if (!seconds) return "the selected period";

  if (seconds < 3600) {
    const minutes = Math.max(1, Math.round(seconds / 60));
    return minutes === 1 ? "the last minute" : `the last ${minutes} minutes`;
  }

  if (seconds < 86_400) {
    const hours = Math.round(seconds / 3600);
    return hours === 1 ? "the last hour" : `the last ${hours} hours`;
  }

  if (seconds < 604_800) {
    const days = Math.round(seconds / 86_400);
    return days === 1 ? "the last day" : `the last ${days} days`;
  }

  if (seconds < 2_592_000) {
    const weeks = Math.round(seconds / 604_800);
    return weeks === 1 ? "the last week" : `the last ${weeks} weeks`;
  }

  const days = Math.round(seconds / 86_400);
  return `the last ${days} days`;
}

export function filterJobsWithinPostedWindow(
  jobs: JobListing[],
  windowSeconds: number
): JobListing[] {
  const cutoff = Date.now() - windowSeconds * 1000;

  return jobs.filter((job) => {
    if (!job.datePosted && !job.dateLabel) {
      return true;
    }

    return jobPostedAtMs(job) >= cutoff;
  });
}
