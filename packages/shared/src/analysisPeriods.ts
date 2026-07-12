import type { AnalysisRecord } from "./analysis.js";
import type { JobRunRecord } from "./types.js";
import { CRON_TIMEZONE, formatCronWorkingHoursRange } from "./schedule.js";

export type ScrapePeriodKind = "incremental";

export interface ScrapePeriodOption {
  id: string;
  kind: ScrapePeriodKind;
  periodStart: string;
  periodEnd: string;
  runCount: number;
  label: string;
  detail: string;
}

function sofiaDateKey(iso: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: CRON_TIMEZONE }).format(new Date(iso));
}

function sofiaTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", {
    timeZone: CRON_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function scrapeCountLabel(count: number): string {
  if (count === 1) return "1 scrape";
  return `${count} scrapes`;
}

function dayCountLabel(days: number): string {
  if (days === 1) return "1 day";
  return `${days} days`;
}

export function periodDayCount(periodStart: string, periodEnd: string): number {
  const startKey = sofiaDateKey(periodStart);
  const endKey = sofiaDateKey(periodEnd);
  const [startYear, startMonth, startDay] = startKey.split("-").map(Number);
  const [endYear, endMonth, endDay] = endKey.split("-").map(Number);
  const start = Date.UTC(startYear, startMonth - 1, startDay);
  const end = Date.UTC(endYear, endMonth - 1, endDay);
  return Math.floor((end - start) / (24 * 60 * 60 * 1000)) + 1;
}

function formatFullDate(dayKey: string): string {
  const [year, month, day] = dayKey.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDateRange(periodStart: string, periodEnd: string): string {
  const startKey = sofiaDateKey(periodStart);
  const endKey = sofiaDateKey(periodEnd);

  if (startKey === endKey) {
    return formatFullDate(startKey);
  }

  const sameYear = startKey.slice(0, 4) === endKey.slice(0, 4);
  const [startYear, startMonth, startDay] = startKey.split("-").map(Number);
  const [endYear, endMonth, endDay] = endKey.split("-").map(Number);
  const startDate = new Date(startYear, startMonth - 1, startDay);
  const endDate = new Date(endYear, endMonth - 1, endDay);

  const startLabel = startDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: sameYear ? undefined : "numeric",
  });
  const endLabel = endDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return `${startLabel} – ${endLabel}`;
}

function latestAnalyzedEndMs(analyses: AnalysisRecord[]): number | null {
  let max: number | null = null;

  for (const analysis of analyses) {
    if (analysis.status !== "completed") continue;
    const end = Date.parse(analysis.periodEnd);
    if (Number.isNaN(end)) continue;
    if (max === null || end > max) max = end;
  }

  return max;
}

export function buildIncrementalAnalysisOption(
  runs: JobRunRecord[],
  analyses: AnalysisRecord[] = []
): ScrapePeriodOption | null {
  if (runs.length === 0) return null;

  const sorted = [...runs].sort(
    (a, b) => Date.parse(a.fetchedAt) - Date.parse(b.fetchedAt)
  );

  const cutoff = latestAnalyzedEndMs(analyses);
  const unanalyzed =
    cutoff === null
      ? sorted
      : sorted.filter((run) => Date.parse(run.fetchedAt) > cutoff);

  if (unanalyzed.length === 0) return null;

  const periodStart = unanalyzed[0].fetchedAt;
  const periodEnd = sorted[sorted.length - 1].fetchedAt;

  return {
    id: "incremental",
    kind: "incremental",
    periodStart,
    periodEnd,
    runCount: unanalyzed.length,
    label: formatScrapePeriodLabel(periodStart, periodEnd, unanalyzed.length),
    detail: `${formatAnalysisPeriodTimeRange(periodStart, periodEnd)} (Sofia)`,
  };
}

/** @deprecated Use buildIncrementalAnalysisOption */
export function buildScrapePeriodOptions(
  runs: JobRunRecord[],
  analyses: AnalysisRecord[] = []
): ScrapePeriodOption[] {
  const option = buildIncrementalAnalysisOption(runs, analyses);
  return option ? [option] : [];
}

export function periodOptionTaken(
  option: ScrapePeriodOption,
  existing: Array<{ periodStart: string; periodEnd: string; status?: string }>
): boolean {
  return existing.some(
    (analysis) =>
      analysis.periodStart === option.periodStart &&
      analysis.periodEnd === option.periodEnd &&
      analysis.status !== "failed"
  );
}

export function formatScrapePeriodLabel(
  periodStart: string,
  periodEnd: string,
  runCount?: number
): string {
  const parts = [
    formatDateRange(periodStart, periodEnd),
    dayCountLabel(periodDayCount(periodStart, periodEnd)),
  ];

  if (runCount) {
    parts.push(scrapeCountLabel(runCount));
  }

  return parts.join(" · ");
}

/** Date range + day count — no scrape count (for analysis UI). */
export function formatAnalysisPeriodLabel(periodStart: string, periodEnd: string): string {
  return formatScrapePeriodLabel(periodStart, periodEnd);
}

/** How job listings are tracked for an analysis period. */
export function formatMarketMonitoringScope(periodStart: string, periodEnd: string): string {
  const days = periodDayCount(periodStart, periodEnd);
  const hours = formatCronWorkingHoursRange();
  return `${formatDateRange(periodStart, periodEnd)} (${dayCountLabel(days)}) · scanned every hour between ${hours} Sofia time`;
}

export function formatAnalysisPeriodTimeRange(periodStart: string, periodEnd: string): string {
  return `${sofiaTime(periodStart)} – ${sofiaTime(periodEnd)}`;
}

export function parsePeriodBound(value: string, endOfDay = false): string {
  const trimmed = value.trim();
  if (!trimmed) throw new Error("Period bound is required");

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const date = new Date(trimmed);
    if (Number.isNaN(date.getTime())) throw new Error(`Invalid date: ${trimmed}`);
    if (endOfDay) date.setUTCHours(23, 59, 59, 999);
    else date.setUTCHours(0, 0, 0, 0);
    return date.toISOString();
  }

  const ms = Date.parse(trimmed);
  if (Number.isNaN(ms)) throw new Error(`Invalid date: ${trimmed}`);
  return new Date(ms).toISOString();
}
