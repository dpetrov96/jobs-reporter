export type AnalysisStatus = "pending" | "running" | "completed" | "failed";

export const ANALYSIS_SK_PREFIX = "__analysis__";

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

export interface AnalysisRecord {
  stage: string;
  fetchedAt: string;
  recordType: "analysis";
  periodStart: string;
  periodEnd: string;
  status: AnalysisStatus;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  error?: string;
  runCount: number;
  totalJobs: number;
  uniqueJobs: number;
  countries: CountryAnalysisResult[];
  aiRecommendations?: string;
  aiSkipped?: boolean;
  aiSkipReason?: string;
}

export interface StartAnalysisRequest {
  periodStart: string;
  periodEnd: string;
}

export interface ListAnalysesResponse {
  ok: boolean;
  count: number;
  analyses: AnalysisRecord[];
  nextCursor?: string;
  error?: string;
}

export interface GetAnalysisResponse {
  ok: boolean;
  analysis?: AnalysisRecord;
  error?: string;
}

export interface StartAnalysisResponse {
  ok: boolean;
  analysis?: AnalysisRecord;
  message?: string;
  error?: string;
}

export function buildAnalysisId(periodStart: string, periodEnd: string): string {
  return `${ANALYSIS_SK_PREFIX}${periodStart}__${periodEnd}`;
}

export function parseAnalysisId(id: string): { periodStart: string; periodEnd: string } | null {
  if (!id.startsWith(ANALYSIS_SK_PREFIX)) return null;

  const body = id.slice(ANALYSIS_SK_PREFIX.length);
  const splitAt = body.indexOf("__");
  if (splitAt <= 0) return null;

  const periodStart = body.slice(0, splitAt);
  const periodEnd = body.slice(splitAt + 2);

  if (Number.isNaN(Date.parse(periodStart)) || Number.isNaN(Date.parse(periodEnd))) {
    return null;
  }

  return { periodStart, periodEnd };
}

export function encodeAnalysisId(id: string): string {
  return encodeURIComponent(id);
}

export function isAnalysisRecord(record: unknown): record is AnalysisRecord {
  if (!record || typeof record !== "object") return false;

  const item = record as Partial<AnalysisRecord>;
  return (
    item.recordType === "analysis" &&
    typeof item.fetchedAt === "string" &&
    item.fetchedAt.startsWith(ANALYSIS_SK_PREFIX) &&
    typeof item.periodStart === "string" &&
    typeof item.periodEnd === "string" &&
    typeof item.status === "string"
  );
}

export function isAnalysisInProgress(status: AnalysisStatus): boolean {
  return status === "pending" || status === "running";
}

export function formatAnalysisPeriod(periodStart: string, periodEnd: string): string {
  const start = new Date(periodStart);
  const end = new Date(periodEnd);
  const opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" };

  return `${start.toLocaleDateString(undefined, opts)} – ${end.toLocaleDateString(undefined, opts)}`;
}

export function formatHourLabel(hour: number): string {
  return `${String(hour).padStart(2, "0")}:00`;
}

const DAY_LABELS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function dayLabel(day: number): string {
  return DAY_LABELS[day] ?? `Day ${day}`;
}

export function normalizePeriodInput(dateStr: string, endOfDay = false): string {
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid date: ${dateStr}`);
  }

  if (endOfDay) {
    date.setUTCHours(23, 59, 59, 999);
  } else {
    date.setUTCHours(0, 0, 0, 0);
  }

  return date.toISOString();
}
