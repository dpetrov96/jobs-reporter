import type { JobListing } from "../linkedin/types.js";
import type { JobRunRecord } from "../runs/index.js";
import { countTechnologies } from "./technologies.js";

const ANALYSIS_TIMEZONE = "Europe/Sofia";
const DAY_LABELS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export interface CountedItem {
  label: string;
  count: number;
}

export interface HourlyDistribution {
  hour: number;
  count: number;
}

export interface DailyDistribution {
  day: number;
  dayLabel: string;
  count: number;
}

export interface CountryAnalysisResult {
  code: string;
  location: string;
  flag: string;
  totalJobs: number;
  topPositions: CountedItem[];
  topTechnologies: CountedItem[];
  hourlyDistribution: HourlyDistribution[];
  dailyDistribution: DailyDistribution[];
  peakHour: number;
  peakDay: string;
}

export interface ComputedAnalysis {
  runCount: number;
  totalJobs: number;
  uniqueJobs: number;
  countries: CountryAnalysisResult[];
}

interface JobWithCountry extends JobListing {
  countryCode: string;
  countryLocation: string;
  countryFlag: string;
}

function normalizeTitle(title: string): string {
  return title.trim().replace(/\s+/g, " ");
}

function collectJobsFromRun(run: JobRunRecord): JobWithCountry[] {
  const jobs: JobWithCountry[] = [];

  for (const country of run.countries ?? []) {
    for (const category of country.categories ?? []) {
      for (const job of category.jobs ?? []) {
        jobs.push({
          ...(job as JobListing),
          keyword: job.keyword ?? category.keyword,
          countryCode: country.code,
          countryLocation: country.location,
          countryFlag: country.flag,
        });
      }
    }
  }

  return jobs;
}

function jobPostedAtMs(job: JobListing): number | undefined {
  if (job.datePosted) {
    const ms = Date.parse(job.datePosted);
    if (!Number.isNaN(ms)) return ms;
  }

  if (job.dateLabel) {
    const text = job.dateLabel.toLowerCase();
    const minuteMatch = text.match(/(\d+)\s*minute/);
    if (minuteMatch) return Date.now() - Number(minuteMatch[1]) * 60_000;

    const hourMatch = text.match(/(\d+)\s*hour/);
    if (hourMatch) return Date.now() - Number(hourMatch[1]) * 3_600_000;

    const dayMatch = text.match(/(\d+)\s*day/);
    if (dayMatch) return Date.now() - Number(dayMatch[1]) * 86_400_000;

    if (text.includes("just now")) return Date.now();
  }

  return undefined;
}

function getHourInTimezone(ms: number): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: ANALYSIS_TIMEZONE,
    hour: "numeric",
    hour12: false,
  }).formatToParts(new Date(ms));

  const hourPart = parts.find((part) => part.type === "hour");
  return hourPart ? Number(hourPart.value) : 0;
}

function getDayInTimezone(ms: number): number {
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone: ANALYSIS_TIMEZONE,
    weekday: "short",
  }).format(new Date(ms));

  const map: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };

  return map[weekday] ?? 0;
}

function topCounted(map: Map<string, number>, limit = 15): CountedItem[] {
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([label, count]) => ({ label, count }));
}

function buildHourlyDistribution(hourCounts: Map<number, number>): HourlyDistribution[] {
  return Array.from({ length: 24 }, (_, hour) => ({
    hour,
    count: hourCounts.get(hour) ?? 0,
  }));
}

function buildDailyDistribution(dayCounts: Map<number, number>): DailyDistribution[] {
  return DAY_LABELS.map((dayLabel, day) => ({
    day,
    dayLabel,
    count: dayCounts.get(day) ?? 0,
  }));
}

function peakFromMap<T>(map: Map<T, number>, fallback: T): T {
  let peak = fallback;
  let max = -1;

  for (const [key, count] of map) {
    if (count > max) {
      max = count;
      peak = key;
    }
  }

  return peak;
}

export function computeAnalysis(runs: JobRunRecord[]): ComputedAnalysis {
  const seenJobIds = new Set<string>();
  const jobsByCountry = new Map<string, JobWithCountry[]>();
  let totalJobs = 0;

  for (const run of runs) {
    for (const job of collectJobsFromRun(run)) {
      totalJobs += 1;

      const key = `${job.countryCode}::${job.id}`;
      if (seenJobIds.has(key)) continue;
      seenJobIds.add(key);

      const list = jobsByCountry.get(job.countryCode) ?? [];
      list.push(job);
      jobsByCountry.set(job.countryCode, list);
    }
  }

  const countries: CountryAnalysisResult[] = [];

  for (const [, jobs] of jobsByCountry) {
    if (jobs.length === 0) continue;

    const sample = jobs[0];
    const positionCounts = new Map<string, number>();
    const techTexts: string[] = [];
    const hourCounts = new Map<number, number>();
    const dayCounts = new Map<number, number>();

    for (const job of jobs) {
      const title = normalizeTitle(job.title);
      positionCounts.set(title, (positionCounts.get(title) ?? 0) + 1);

      const text = [job.title, job.keyword ?? ""].filter(Boolean).join(" ");
      techTexts.push(text);

      const postedMs = jobPostedAtMs(job);
      if (postedMs !== undefined) {
        const hour = getHourInTimezone(postedMs);
        const day = getDayInTimezone(postedMs);
        hourCounts.set(hour, (hourCounts.get(hour) ?? 0) + 1);
        dayCounts.set(day, (dayCounts.get(day) ?? 0) + 1);
      }
    }

    const peakHour = peakFromMap(hourCounts, 9);
    const peakDayIndex = peakFromMap(dayCounts, 1);

    countries.push({
      code: sample.countryCode,
      location: sample.countryLocation,
      flag: sample.countryFlag,
      totalJobs: jobs.length,
      topPositions: topCounted(positionCounts),
      topTechnologies: topCounted(countTechnologies(techTexts)),
      hourlyDistribution: buildHourlyDistribution(hourCounts),
      dailyDistribution: buildDailyDistribution(dayCounts),
      peakHour,
      peakDay: DAY_LABELS[peakDayIndex] ?? "Monday",
    });
  }

  countries.sort((a, b) => b.totalJobs - a.totalJobs || a.location.localeCompare(b.location));

  return {
    runCount: runs.length,
    totalJobs,
    uniqueJobs: seenJobIds.size,
    countries,
  };
}

export function summarizeForAi(result: ComputedAnalysis): string {
  const lines: string[] = [
    `Period analysis: ${result.runCount} fetch runs, ${result.uniqueJobs} unique jobs.`,
  ];

  for (const country of result.countries) {
    lines.push(`\n## ${country.flag} ${country.location} (${country.totalJobs} jobs)`);
    lines.push(
      `Top positions: ${country.topPositions
        .slice(0, 8)
        .map((item) => `${item.label} (${item.count})`)
        .join(", ")}`
    );
    lines.push(
      `Top technologies: ${country.topTechnologies
        .slice(0, 10)
        .map((item) => `${item.label} (${item.count})`)
        .join(", ")}`
    );
    lines.push(`Peak posting hour: ${String(country.peakHour).padStart(2, "0")}:00 Sofia time`);
    lines.push(`Peak posting day: ${country.peakDay}`);
  }

  return lines.join("\n");
}
