import type { JobListing } from "../linkedin/types.js";
import { jobPostedAtMs as resolveJobPostedAtMs } from "../linkedin/jobTime.js";
import type { JobRunRecord } from "../runs/index.js";
import { formatKeywordLabel } from "../../shared/keywords.js";
import { sortByCountryDisplayOrder } from "../../shared/countries.js";
import type { AiJobSample } from "./descriptions.js";
import { extractTechnologies } from "./technologies.js";

export type { AiJobSample } from "./descriptions.js";

const ANALYSIS_TIMEZONE = "Europe/Sofia";
const DAY_LABELS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const PEAK_HOUR_WINDOW = 3;
const MAX_SAMPLES_PER_KEYWORD = 4;
const MAX_GLOBAL_KEYWORDS = 5;
const MAX_JOB_SAMPLES = 28;
const MAX_TOP_COMPANIES = 5;

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

export interface CompanyCountryStat {
  code: string;
  count: number;
}

export interface CompanyHiringItem {
  name: string;
  count: number;
  logoUrl?: string;
  url?: string;
  countries?: CompanyCountryStat[];
}

export interface PositionHiringStat {
  label: string;
  count: number;
  topCompanies: CompanyHiringItem[];
}

export interface CountryAnalysisResult {
  code: string;
  location: string;
  flag: string;
  totalJobs: number;
  topCompanies: CompanyHiringItem[];
  topPositions: PositionHiringStat[];
  topTechnologies: CountedItem[];
  hourlyDistribution: HourlyDistribution[];
  dailyDistribution: DailyDistribution[];
  topCalendarDays: CountedItem[];
  topWeekdays: CountedItem[];
  peakHour: number;
  peakHourRangeStart: number;
  peakHourRangeEnd: number;
  peakHourRange: string;
  peakDay: string;
}

export interface ComputedAnalysis {
  runCount: number;
  totalJobs: number;
  uniqueJobs: number;
  uniqueCompanies: number;
  globalCompanies: CompanyHiringItem[];
  countries: CountryAnalysisResult[];
  globalTopRoles: CountedItem[];
  globalTopTechnologies: CountedItem[];
  jobSamples: AiJobSample[];
}

interface JobWithCountry extends JobListing {
  countryCode: string;
  countryLocation: string;
  countryFlag: string;
}

function jobPostedAtMs(job: JobListing, referenceMs: number): number | undefined {
  const hasDateSignal = Boolean(job.datePosted?.trim() || job.dateLabel?.trim());
  if (!hasDateSignal) return undefined;

  return resolveJobPostedAtMs(job, referenceMs);
}

function collectJobsFromRun(run: JobRunRecord): Array<JobWithCountry & { scrapeMs: number }> {
  const scrapeMs = Date.parse(run.fetchedAt);
  const referenceMs = Number.isNaN(scrapeMs) ? Date.now() : scrapeMs;
  const jobs: Array<JobWithCountry & { scrapeMs: number }> = [];

  for (const country of run.countries ?? []) {
    for (const category of country.categories ?? []) {
      for (const job of category.jobs ?? []) {
        jobs.push({
          ...(job as JobListing),
          keyword: job.keyword ?? category.keyword,
          countryCode: country.code,
          countryLocation: country.location,
          countryFlag: country.flag,
          scrapeMs: referenceMs,
        });
      }
    }
  }

  return jobs;
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

function normalizeKeyword(keyword: string): string {
  return keyword.trim().toLowerCase();
}

function topCounted(map: Map<string, number>, limit = 15): CountedItem[] {
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([label, count]) => ({ label, count }));
}

function normalizeCompanyKey(company: string): string {
  return company.trim().toLowerCase();
}

interface CompanyAccumulator {
  name: string;
  logoUrl?: string;
  url?: string;
  jobIds: Set<string>;
}

function getCompanyAccumulator(
  map: Map<string, CompanyAccumulator>,
  job: JobWithCountry
): CompanyAccumulator | null {
  const name = job.company?.trim();
  if (!name || !job.id) return null;

  const key = normalizeCompanyKey(name);
  let company = map.get(key);
  if (!company) {
    company = {
      name,
      logoUrl: job.companyLogoUrl,
      url: job.url,
      jobIds: new Set(),
    };
    map.set(key, company);
  }

  if (job.companyLogoUrl && !company.logoUrl) {
    company.logoUrl = job.companyLogoUrl;
  }
  if (job.url && !company.url) {
    company.url = job.url;
  }

  company.jobIds.add(job.id);
  return company;
}

function topCompanyItems(
  companies: Map<string, CompanyAccumulator>,
  limit = MAX_TOP_COMPANIES
): CompanyHiringItem[] {
  return [...companies.values()]
    .sort((a, b) => b.jobIds.size - a.jobIds.size || a.name.localeCompare(b.name))
    .slice(0, limit)
    .map((company) => ({
      name: company.name,
      count: company.jobIds.size,
      logoUrl: company.logoUrl,
      url: company.url,
    }));
}

function trackKeywordCompany(
  country: CountryAccumulator,
  keyword: string,
  job: JobWithCountry
): void {
  if (!keyword || !job.id) return;

  let keywordCompanies = country.keywordCompanyJobs.get(keyword);
  if (!keywordCompanies) {
    keywordCompanies = new Map();
    country.keywordCompanyJobs.set(keyword, keywordCompanies);
  }

  getCompanyAccumulator(keywordCompanies, job);
}

function buildTopPositions(country: CountryAccumulator): PositionHiringStat[] {
  return [...country.keywordJobIds.entries()]
    .sort((a, b) => b[1].size - a[1].size || a[0].localeCompare(b[0]))
    .slice(0, 10)
    .map(([keyword, ids]) => ({
      label: formatKeywordLabel(keyword),
      count: ids.size,
      topCompanies: topCompanyItems(country.keywordCompanyJobs.get(keyword) ?? new Map()),
    }));
}

function trackJobSample(country: CountryAccumulator, job: JobWithCountry): void {
  const keyword = normalizeKeyword(job.keyword ?? "");
  if (!keyword || !job.id) return;

  let samples = country.keywordSamples.get(keyword);
  if (!samples) {
    samples = [];
    country.keywordSamples.set(keyword, samples);
  }

  if (samples.length >= MAX_SAMPLES_PER_KEYWORD) return;
  if (samples.some((sample) => sample.id === job.id)) return;

  samples.push({
    id: job.id,
    title: job.title,
    company: job.company,
    keyword,
    countryCode: country.code,
    countryLabel: country.location,
  });
}

function trackKeywordMatch(country: CountryAccumulator, job: JobWithCountry): void {
  const keyword = normalizeKeyword(job.keyword ?? "");
  if (!keyword || !job.id) return;

  let ids = country.keywordJobIds.get(keyword);
  if (!ids) {
    ids = new Set();
    country.keywordJobIds.set(keyword, ids);
  }

  ids.add(job.id);
  trackKeywordCompany(country, keyword, job);
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

function getCalendarDayInTimezone(ms: number): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: ANALYSIS_TIMEZONE }).format(new Date(ms));
}

function formatCalendarDayLabel(dayKey: string): string {
  const [year, month, day] = dayKey.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

function formatHourRange(start: number, end: number): string {
  const pad = (hour: number) => `${String(hour).padStart(2, "0")}:00`;
  return `${pad(start)}–${pad(end)}`;
}

function findPeakHourRange(hourly: HourlyDistribution[]): {
  start: number;
  end: number;
  count: number;
} {
  let bestStart = 9;
  let bestCount = -1;

  for (let start = 0; start <= 24 - PEAK_HOUR_WINDOW; start += 1) {
    let sum = 0;
    for (let hour = start; hour < start + PEAK_HOUR_WINDOW; hour += 1) {
      sum += hourly.find((item) => item.hour === hour)?.count ?? 0;
    }
    if (sum > bestCount) {
      bestCount = sum;
      bestStart = start;
    }
  }

  return {
    start: bestStart,
    end: bestStart + PEAK_HOUR_WINDOW - 1,
    count: Math.max(bestCount, 0),
  };
}

function buildTopWeekdays(dayCounts: Map<number, number>): CountedItem[] {
  return [...dayCounts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0] - b[0])
    .map(([day, count]) => ({
      label: DAY_LABELS[day] ?? `Day ${day}`,
      count,
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

interface CountryAccumulator {
  code: string;
  location: string;
  flag: string;
  keywordJobIds: Map<string, Set<string>>;
  keywordCompanyJobs: Map<string, Map<string, CompanyAccumulator>>;
  companyJobs: Map<string, CompanyAccumulator>;
  keywordSamples: Map<string, AiJobSample[]>;
  techCounts: Map<string, number>;
  hourCounts: Map<number, number>;
  dayCounts: Map<number, number>;
  calendarDayCounts: Map<string, number>;
  uniqueJobs: number;
}

export interface AnalysisAccumulator {
  seenJobIds: Set<string>;
  countries: Map<string, CountryAccumulator>;
  totalJobs: number;
  runCount: number;
}

export function createAnalysisAccumulator(): AnalysisAccumulator {
  return {
    seenJobIds: new Set(),
    countries: new Map(),
    totalJobs: 0,
    runCount: 0,
  };
}

function getCountryAccumulator(
  acc: AnalysisAccumulator,
  job: JobWithCountry
): CountryAccumulator {
  let country = acc.countries.get(job.countryCode);
  if (!country) {
    country = {
      code: job.countryCode,
      location: job.countryLocation,
      flag: job.countryFlag,
      keywordJobIds: new Map(),
      keywordCompanyJobs: new Map(),
      companyJobs: new Map(),
      keywordSamples: new Map(),
      techCounts: new Map(),
      hourCounts: new Map(),
      dayCounts: new Map(),
      calendarDayCounts: new Map(),
      uniqueJobs: 0,
    };
    acc.countries.set(job.countryCode, country);
  }
  return country;
}

function ingestJob(acc: AnalysisAccumulator, job: JobWithCountry & { scrapeMs: number }): void {
  acc.totalJobs += 1;

  const country = getCountryAccumulator(acc, job);
  trackKeywordMatch(country, job);
  trackJobSample(country, job);

  const dedupeKey = `${job.countryCode}::${job.id}`;
  if (acc.seenJobIds.has(dedupeKey)) return;
  acc.seenJobIds.add(dedupeKey);

  country.uniqueJobs += 1;
  getCompanyAccumulator(country.companyJobs, job);

  const text = [job.title, job.keyword ?? ""].filter(Boolean).join(" ");
  for (const tech of extractTechnologies(text)) {
    country.techCounts.set(tech, (country.techCounts.get(tech) ?? 0) + 1);
  }

  const postedMs = jobPostedAtMs(job, job.scrapeMs);
  if (postedMs !== undefined) {
    const hour = getHourInTimezone(postedMs);
    const day = getDayInTimezone(postedMs);
    const calendarDay = getCalendarDayInTimezone(postedMs);
    country.hourCounts.set(hour, (country.hourCounts.get(hour) ?? 0) + 1);
    country.dayCounts.set(day, (country.dayCounts.get(day) ?? 0) + 1);
    country.calendarDayCounts.set(
      calendarDay,
      (country.calendarDayCounts.get(calendarDay) ?? 0) + 1
    );
  }
}

export function addRunsToAccumulator(
  acc: AnalysisAccumulator,
  runs: JobRunRecord[]
): void {
  acc.runCount += runs.length;

  for (const run of runs) {
    for (const job of collectJobsFromRun(run)) {
      ingestJob(acc, job);
    }
  }
}

function finalizeCountry(country: CountryAccumulator): CountryAnalysisResult {
  const hourlyDistribution = buildHourlyDistribution(country.hourCounts);
  const peakHour = peakFromMap(country.hourCounts, 9);
  const peakDayIndex = peakFromMap(country.dayCounts, 1);
  const hourRange = findPeakHourRange(hourlyDistribution);

  const topCalendarDays = [...country.calendarDayCounts.entries()]
    .sort((a, b) => b[1] - a[1] || b[0].localeCompare(a[0]))
    .slice(0, 10)
    .map(([dayKey, count]) => ({
      label: formatCalendarDayLabel(dayKey),
      count,
    }));

  return {
    code: country.code,
    location: country.location,
    flag: country.flag,
    totalJobs: country.uniqueJobs,
    topCompanies: topCompanyItems(country.companyJobs),
    topPositions: buildTopPositions(country),
    topTechnologies: topCounted(country.techCounts),
    hourlyDistribution,
    dailyDistribution: buildDailyDistribution(country.dayCounts),
    topCalendarDays,
    topWeekdays: buildTopWeekdays(country.dayCounts),
    peakHour,
    peakHourRangeStart: hourRange.start,
    peakHourRangeEnd: hourRange.end,
    peakHourRange: formatHourRange(hourRange.start, hourRange.end),
    peakDay: DAY_LABELS[peakDayIndex] ?? "Monday",
  };
}

function collectGlobalCompanies(acc: AnalysisAccumulator): CompanyHiringItem[] {
  const merged = new Map<
    string,
    CompanyAccumulator & { countryCounts: Map<string, number> }
  >();

  for (const country of acc.countries.values()) {
    for (const company of country.companyJobs.values()) {
      const key = normalizeCompanyKey(company.name);
      let existing = merged.get(key);
      if (!existing) {
        existing = {
          name: company.name,
          logoUrl: company.logoUrl,
          url: company.url,
          jobIds: new Set(),
          countryCounts: new Map(),
        };
        merged.set(key, existing);
      }

      if (company.logoUrl && !existing.logoUrl) {
        existing.logoUrl = company.logoUrl;
      }
      if (company.url && !existing.url) {
        existing.url = company.url;
      }

      for (const jobId of company.jobIds) {
        existing.jobIds.add(`${country.code}::${jobId}`);
      }

      existing.countryCounts.set(
        country.code,
        (existing.countryCounts.get(country.code) ?? 0) + company.jobIds.size
      );
    }
  }

  return [...merged.values()]
    .sort((a, b) => b.jobIds.size - a.jobIds.size || a.name.localeCompare(b.name))
    .map((company) => ({
      name: company.name,
      count: company.jobIds.size,
      logoUrl: company.logoUrl,
      url: company.url,
      countries: [...company.countryCounts.entries()]
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
        .map(([code, count]) => ({ code, count })),
    }));
}

export function finalizeAccumulator(acc: AnalysisAccumulator): ComputedAnalysis {
  const globalCompanies = collectGlobalCompanies(acc);
  const countries = sortByCountryDisplayOrder(
    [...acc.countries.values()]
      .filter((country) => country.uniqueJobs > 0)
      .map(finalizeCountry)
  );

  return {
    runCount: acc.runCount,
    totalJobs: acc.totalJobs,
    uniqueJobs: acc.seenJobIds.size,
    uniqueCompanies: globalCompanies.length,
    globalCompanies,
    countries,
    globalTopRoles: collectGlobalTopRoles(acc),
    globalTopTechnologies: collectGlobalTopTechnologies(acc),
    jobSamples: collectJobSamples(acc),
  };
}

function collectGlobalTopRoles(acc: AnalysisAccumulator): CountedItem[] {
  const keywordJobs = new Map<string, Set<string>>();

  for (const country of acc.countries.values()) {
    for (const [keyword, ids] of country.keywordJobIds) {
      let set = keywordJobs.get(keyword);
      if (!set) {
        set = new Set();
        keywordJobs.set(keyword, set);
      }
      for (const id of ids) {
        set.add(`${country.code}::${id}`);
      }
    }
  }

  return [...keywordJobs.entries()]
    .sort((a, b) => b[1].size - a[1].size || a[0].localeCompare(b[0]))
    .map(([keyword, ids]) => ({
      label: formatKeywordLabel(keyword),
      count: ids.size,
    }));
}

function collectGlobalTopTechnologies(acc: AnalysisAccumulator): CountedItem[] {
  const techCounts = new Map<string, number>();

  for (const country of acc.countries.values()) {
    for (const [tech, count] of country.techCounts) {
      techCounts.set(tech, (techCounts.get(tech) ?? 0) + count);
    }
  }

  return topCounted(techCounts, 15);
}

function collectJobSamples(acc: AnalysisAccumulator): AiJobSample[] {
  const samples: AiJobSample[] = [];
  const seen = new Set<string>();
  const keywordJobs = new Map<string, Set<string>>();

  for (const country of acc.countries.values()) {
    for (const [keyword, ids] of country.keywordJobIds) {
      let set = keywordJobs.get(keyword);
      if (!set) {
        set = new Set();
        keywordJobs.set(keyword, set);
      }
      for (const id of ids) {
        set.add(`${country.code}::${id}`);
      }
    }
  }

  const topKeywords = [...keywordJobs.entries()]
    .sort((a, b) => b[1].size - a[1].size || a[0].localeCompare(b[0]))
    .slice(0, MAX_GLOBAL_KEYWORDS)
    .map(([keyword]) => keyword);

  for (const keyword of topKeywords) {
    for (const country of acc.countries.values()) {
      for (const sample of country.keywordSamples.get(keyword) ?? []) {
        if (seen.has(sample.id)) continue;
        seen.add(sample.id);
        samples.push(sample);
        if (samples.length >= MAX_JOB_SAMPLES) return samples;
      }
    }
  }

  return samples;
}

export function computeAnalysis(runs: JobRunRecord[]): ComputedAnalysis {
  const acc = createAnalysisAccumulator();
  addRunsToAccumulator(acc, runs);
  return finalizeAccumulator(acc);
}

export function summarizeForAi(result: ComputedAnalysis): string {
  const lines: string[] = [
    `Period: ${result.runCount} scrapes, ${result.uniqueJobs} unique listings across ${result.countries.length} countries.`,
    "",
    "## Top in-demand roles (all countries)",
    result.globalTopRoles
      .slice(0, 8)
      .map((item, index) => `${index + 1}. ${item.label} — ${item.count} listings`)
      .join("\n"),
    "",
    "## Most common technologies (overall)",
    result.globalTopTechnologies
      .slice(0, 12)
      .map((item) => `${item.label} (${item.count})`)
      .join(", "),
    "",
    "## Top technologies from stats (keyword extraction — supplement with descriptions)",
    result.globalTopTechnologies
      .slice(0, 15)
      .map((item, index) => `${index + 1}. ${item.label} — ${item.count} mentions`)
      .join("\n"),
    "",
    "## Breakdown by country (context)",
  ];

  for (const country of result.countries) {
    lines.push(
      `- ${country.flag} ${country.location}: ${country.totalJobs} listings · top roles: ${country.topPositions
        .slice(0, 4)
        .map((item) => `${item.label} (${item.count})`)
        .join(", ")}`
    );
  }

  return lines.join("\n");
}
