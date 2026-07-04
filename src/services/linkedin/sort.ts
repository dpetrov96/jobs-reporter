import type { JobListing } from "./types.js";

function relativeLabelToMs(label: string): number | undefined {
  const text = label.toLowerCase();

  const minuteMatch = text.match(/(\d+)\s*minute/);
  if (minuteMatch) return Date.now() - Number(minuteMatch[1]) * 60_000;

  const hourMatch = text.match(/(\d+)\s*hour/);
  if (hourMatch) return Date.now() - Number(hourMatch[1]) * 3_600_000;

  const dayMatch = text.match(/(\d+)\s*day/);
  if (dayMatch) return Date.now() - Number(dayMatch[1]) * 86_400_000;

  const weekMatch = text.match(/(\d+)\s*week/);
  if (weekMatch) return Date.now() - Number(weekMatch[1]) * 7 * 86_400_000;

  const monthMatch = text.match(/(\d+)\s*month/);
  if (monthMatch) return Date.now() - Number(monthMatch[1]) * 30 * 86_400_000;

  if (text.includes("just now")) return Date.now();

  return undefined;
}

export function jobPostedAtMs(job: JobListing): number {
  if (job.datePosted) {
    const ms = Date.parse(job.datePosted);
    if (!Number.isNaN(ms)) return ms;
  }

  if (job.dateLabel) {
    const relative = relativeLabelToMs(job.dateLabel);
    if (relative !== undefined) return relative;
  }

  const numericId = Number(job.linkedInJobId);
  return Number.isFinite(numericId) ? numericId : 0;
}

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
