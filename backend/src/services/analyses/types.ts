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

export function buildAnalysisId(periodStart: string, periodEnd: string): string {
  return `${ANALYSIS_SK_PREFIX}${periodStart}__${periodEnd}`;
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
