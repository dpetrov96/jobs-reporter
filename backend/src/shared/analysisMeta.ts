import { getCountryFlag, sortByCountryDisplayOrder } from "./countries.js";
import { CRON_TIMEZONE } from "./schedule.js";

export const ANALYSIS_PRODUCT_TITLE = "Job market analytics";

export interface AnalysisShareInput {
  periodStart: string;
  periodEnd: string;
  countries?: Array<{ code: string; location: string; flag?: string }>;
  countryCount?: number;
  totalJobs?: number;
  uniqueCompanies?: number;
}

export interface AnalysisShareMeta {
  title: string;
  description: string;
  ogTitle: string;
  ogDescription: string;
}

function sofiaDateKey(iso: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: CRON_TIMEZONE }).format(new Date(iso));
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

export function formatAnalysisDateRange(periodStart: string, periodEnd: string): string {
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

function formatCountryFlags(
  countries: Array<{ code: string; flag?: string }>
): string {
  return countries.map((country) => country.flag || getCountryFlag(country.code)).join(" ");
}

function formatCountryDescription(
  countries: Array<{ code: string; location: string; flag?: string }>
): string {
  return countries
    .map((country) => `${country.flag || getCountryFlag(country.code)} ${country.location}`)
    .join(" · ");
}

export function buildAnalysisShareMeta(
  input: AnalysisShareInput,
  options?: { suffix?: string }
): AnalysisShareMeta {
  const period = formatAnalysisDateRange(input.periodStart, input.periodEnd);
  const countries = input.countries?.length
    ? sortByCountryDisplayOrder(input.countries)
    : [];
  const flags = countries.length > 0 ? formatCountryFlags(countries) : "";

  const prefixParts = [period];
  if (flags) prefixParts.push(flags);
  const prefix = prefixParts.join(" · ");

  const suffix = options?.suffix ? ` · ${options.suffix}` : "";
  const title = `${prefix} | ${ANALYSIS_PRODUCT_TITLE}${suffix}`;

  let description: string;
  if (countries.length > 0) {
    description = formatCountryDescription(countries);
  } else if (input.countryCount && input.countryCount > 0) {
    description = `${input.countryCount} EU markets · ${ANALYSIS_PRODUCT_TITLE}`;
  } else {
    description = ANALYSIS_PRODUCT_TITLE;
  }

  return {
    title,
    description,
    ogTitle: title,
    ogDescription: description,
  };
}
