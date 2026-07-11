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

function hasTimePrecision(value: string): boolean {
  return value.includes("T") || /\d{1,2}:\d{2}/.test(value);
}

export function jobPostedAtMs(job: JobListing): number {
  if (job.dateLabel) {
    const relative = relativeLabelToMs(job.dateLabel);
    if (relative !== undefined) return relative;
  }

  if (job.datePosted) {
    const ms = Date.parse(job.datePosted);
    if (!Number.isNaN(ms)) {
      if (!hasTimePrecision(job.datePosted)) {
        return Date.now();
      }

      return ms;
    }
  }

  const numericId = Number(job.linkedInJobId);
  return Number.isFinite(numericId) ? numericId : Date.now();
}

export function jobDateDisplay(job: JobListing): string {
  return job.dateLabel ?? job.datePosted ?? "Recently";
}

export function isJobFreshWithinMinutes(job: JobListing, minutes = 15): boolean {
  if (job.dateLabel) {
    const text = job.dateLabel.toLowerCase();
    if (text.includes("just now")) return true;

    const minuteMatch = text.match(/(\d+)\s*minute/);
    if (minuteMatch) return Number(minuteMatch[1]) <= minutes;

    return false;
  }

  if (job.datePosted && hasTimePrecision(job.datePosted)) {
    const ms = Date.parse(job.datePosted);
    if (!Number.isNaN(ms)) {
      return Date.now() - ms <= minutes * 60_000;
    }
  }

  return false;
}

export function formatApplicants(job: JobListing): string | undefined {
  if (job.applicantsLabel?.trim()) return job.applicantsLabel.trim();
  if (job.applicantCount != null) return `${job.applicantCount} applicants`;
  return undefined;
}

export const HIGH_APPLICANT_THRESHOLD = 100;

export function isHighApplicantJob(job: JobListing): boolean {
  if (job.applicantCount != null && job.applicantCount > HIGH_APPLICANT_THRESHOLD) {
    return true;
  }

  if (job.applicantCount === HIGH_APPLICANT_THRESHOLD) {
    return /over\s+100\b/i.test(job.applicantsLabel ?? "");
  }

  const overMatch = job.applicantsLabel?.match(/over\s+(\d+)/i);
  if (overMatch) {
    const count = Number(overMatch[1]);
    return Number.isFinite(count) && count >= HIGH_APPLICANT_THRESHOLD;
  }

  return false;
}

export function highApplicantChipLabel(job: JobListing): string {
  if (job.applicantCount != null && job.applicantCount > HIGH_APPLICANT_THRESHOLD) {
    return `${job.applicantCount}+`;
  }
  return "100+";
}
