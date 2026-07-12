export type AnalysisStatus = "pending" | "running" | "completed" | "failed";

export const ANALYSIS_SK_PREFIX = "__analysis__";

export interface CountedItem {
  label: string;
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
  domain?: string;
  countries?: CompanyCountryStat[];
}

export interface PositionHiringStat {
  label: string;
  count: number;
  topCompanies: CompanyHiringItem[];
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

export interface AnalysisRecord {
  stage: string;
  fetchedAt: string;
  recordType: "analysis";
  periodStart: string;
  periodEnd: string;
  periodLabel?: string;
  status: AnalysisStatus;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  error?: string;
  runCount: number;
  totalJobs: number;
  uniqueJobs: number;
  uniqueCompanies?: number;
  globalCompanies?: CompanyHiringItem[];
  countryCount?: number;
  countries?: CountryAnalysisResult[];
  aiRecommendations?: string;
  aiSkipped?: boolean;
  aiSkipReason?: string;
  progressMessage?: string;
  aiKeyConfigured?: boolean;
  aiEnabled?: boolean;
  domainEnrichmentStatus?: "idle" | "pending" | "running" | "completed" | "failed" | "cancelled";
  domainEnrichmentProgress?: string;
  domainEnrichmentStartedAt?: string;
  domainEnrichmentCountryCode?: string;
  domainEnrichmentProcessed?: number;
  domainEnrichmentTotal?: number;
  domainEnrichmentResults?: Array<{
    name: string;
    domain?: string;
    status: "found" | "not_found";
  }>;
  domainEnrichmentCancelRequested?: boolean;
  domainsEnrichedAt?: string;
  domainEnrichmentError?: string;
}

export function buildAnalysisId(periodStart: string, periodEnd: string): string {
  return `${ANALYSIS_SK_PREFIX}${periodStart}__${periodEnd}`;
}

export function normalizePeriodInput(value: string, endOfDay = false): string {
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
