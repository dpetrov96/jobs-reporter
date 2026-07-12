import { formatAnalysisPeriodLabel, parsePeriodBound } from "./analysisPeriods.js";

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

export type DomainEnrichmentStatus = "idle" | "pending" | "running" | "completed" | "failed" | "cancelled";

export interface DomainEnrichmentResult {
  name: string;
  domain?: string;
  status: "found" | "not_found";
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
  domainEnrichmentStatus?: DomainEnrichmentStatus;
  domainEnrichmentProgress?: string;
  domainEnrichmentStartedAt?: string;
  domainEnrichmentCountryCode?: string;
  domainEnrichmentProcessed?: number;
  domainEnrichmentTotal?: number;
  domainEnrichmentResults?: DomainEnrichmentResult[];
  domainEnrichmentCancelRequested?: boolean;
  domainsEnrichedAt?: string;
  domainEnrichmentError?: string;
}

export interface StartAnalysisRequest {
  periodStart: string;
  periodEnd: string;
  periodLabel?: string;
  reanalyze?: boolean;
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

export interface EnrichCompanyDomainsResponse {
  ok: boolean;
  message?: string;
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

export function isDomainEnrichmentInProgress(status?: DomainEnrichmentStatus): boolean {
  return status === "pending" || status === "running";
}

export function getAnalysisCountryCount(analysis: AnalysisRecord): number {
  if (analysis.countries?.length) return analysis.countries.length;
  if (analysis.countryCount != null) return analysis.countryCount;
  return 0;
}

export function formatAnalysisPeriod(
  periodStart: string,
  periodEnd: string,
  _runCount?: number
): string {
  return formatAnalysisPeriodLabel(periodStart, periodEnd);
}

export function formatHourLabel(hour: number): string {
  return `${String(hour).padStart(2, "0")}:00`;
}

const DAY_LABELS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const BG_WEEKDAY_LABELS: Record<string, string> = {
  неделя: "Sunday",
  понеделник: "Monday",
  вторник: "Tuesday",
  сряда: "Wednesday",
  четвъртък: "Thursday",
  петък: "Friday",
  събота: "Saturday",
  нед: "Sunday",
  пон: "Monday",
  вто: "Tuesday",
  сря: "Wednesday",
  чет: "Thursday",
  чтв: "Thursday",
  чт: "Thursday",
  пет: "Friday",
  съб: "Saturday",
  сб: "Saturday",
  нд: "Sunday",
  пн: "Monday",
  вт: "Tuesday",
  ср: "Wednesday",
  пт: "Friday",
};

const BG_MONTH_REPLACEMENTS: Array<[string, string]> = [
  ["януари", "January"],
  ["февруари", "February"],
  ["март", "March"],
  ["април", "April"],
  ["май", "May"],
  ["юни", "June"],
  ["юли", "July"],
  ["август", "August"],
  ["септември", "September"],
  ["октомври", "October"],
  ["ноември", "November"],
  ["декември", "December"],
  ["яну", "Jan"],
  ["фев", "Feb"],
  ["мар", "Mar"],
  ["апр", "Apr"],
  ["авг", "Aug"],
  ["сеп", "Sep"],
  ["окт", "Oct"],
  ["ное", "Nov"],
  ["дек", "Dec"],
  ["юли", "Jul"],
  ["юни", "Jun"],
];

export function dayLabel(day: number): string {
  return DAY_LABELS[day] ?? `Day ${day}`;
}

export function normalizeWeekdayLabel(label: string): string {
  const trimmed = label.trim();
  const mapped = BG_WEEKDAY_LABELS[trimmed.toLowerCase()];
  return mapped ?? trimmed;
}

export function normalizeCalendarDayLabel(label: string): string {
  if (!/[а-яА-Я]/.test(label)) return label;

  let result = label;

  for (const [bg, en] of Object.entries(BG_WEEKDAY_LABELS)) {
    const pattern = new RegExp(`\\b${bg}\\b`, "gi");
    result = result.replace(pattern, en.length <= 3 ? en : en.slice(0, 3));
  }

  for (const [bg, en] of BG_MONTH_REPLACEMENTS) {
    const pattern = new RegExp(`\\b${bg}\\.?\\b`, "gi");
    result = result.replace(pattern, en);
  }

  result = result.replace(/\s*г\.?\s*$/i, "");
  result = result.replace(/\./g, "");
  result = result.replace(/\s+/g, " ").trim();

  return result;
}

export function normalizePeriodInput(dateStr: string, endOfDay = false): string {
  return parsePeriodBound(dateStr, endOfDay);
}
