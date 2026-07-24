import type { JobRunRecord } from "@jobs-reporter/shared";
import { isDailySummaryRun, sortByCountryDisplayOrder } from "@jobs-reporter/shared";

export type TrendGranularity = "day" | "month";

export type TrendBar = {
  key: string;
  label: string;
  shortLabel: string;
  totalJobs: number;
  scrapeCount?: number;
  dayCount?: number;
  fetchedAt?: string;
};

export type TrendCountryOption = {
  code: string;
  location: string;
  flag?: string;
  /** Latest known daily total for this market (for tab badges). */
  totalJobs: number;
};

function dayKeyOf(run: JobRunRecord): string | null {
  if (run.dayKey && /^\d{4}-\d{2}-\d{2}$/.test(run.dayKey)) return run.dayKey;
  if (run.fetchedAt) return run.fetchedAt.slice(0, 10);
  return null;
}

function jobsForScope(run: JobRunRecord, countryCode?: string | null): number {
  if (!countryCode) return run.totalJobs;
  const match = (run.countries ?? []).find((country) => country.code === countryCode);
  return match?.totalJobs ?? 0;
}

function formatDayLabel(dayKey: string): { label: string; shortLabel: string } {
  const date = new Date(`${dayKey}T12:00:00.000Z`);
  return {
    label: date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    }),
    shortLabel: date.toLocaleDateString("en-US", {
      day: "numeric",
      timeZone: "UTC",
    }),
  };
}

function formatMonthLabel(monthKey: string): { label: string; shortLabel: string } {
  const date = new Date(`${monthKey}-01T12:00:00.000Z`);
  return {
    label: date.toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    }),
    shortLabel: date.toLocaleDateString("en-US", {
      month: "short",
      timeZone: "UTC",
    }),
  };
}

export function listTrendCountries(runs: JobRunRecord[]): TrendCountryOption[] {
  const byCode = new Map<string, TrendCountryOption & { dayKey: string }>();

  for (const run of runs) {
    if (!isDailySummaryRun(run)) continue;
    const dayKey = dayKeyOf(run);
    if (!dayKey) continue;

    for (const country of run.countries ?? []) {
      if (!country.code) continue;
      const existing = byCode.get(country.code);
      if (existing && existing.dayKey >= dayKey) continue;
      byCode.set(country.code, {
        code: country.code,
        location: country.location,
        flag: country.flag,
        totalJobs: country.totalJobs ?? 0,
        dayKey,
      });
    }
  }

  return sortByCountryDisplayOrder(
    [...byCode.values()].map(({ dayKey: _dayKey, ...country }) => country)
  );
}

/** Chronological daily bars; optional countryCode scopes to one market. */
export function buildDailyTrendBars(
  runs: JobRunRecord[],
  countryCode?: string | null
): TrendBar[] {
  const byDay = new Map<string, TrendBar>();

  for (const run of runs) {
    if (!isDailySummaryRun(run)) continue;
    const dayKey = dayKeyOf(run);
    if (!dayKey) continue;

    const totalJobs = jobsForScope(run, countryCode);
    const existing = byDay.get(dayKey);
    if (
      existing?.fetchedAt &&
      Date.parse(existing.fetchedAt) >= Date.parse(run.fetchedAt)
    ) {
      continue;
    }

    const { label, shortLabel } = formatDayLabel(dayKey);
    byDay.set(dayKey, {
      key: dayKey,
      label,
      shortLabel,
      totalJobs,
      scrapeCount: run.scrapeCount,
      fetchedAt: run.fetchedAt,
    });
  }

  return [...byDay.values()].sort((a, b) => a.key.localeCompare(b.key));
}

/** Monthly average of daily totals — fair when months have different day counts. */
export function buildMonthlyTrendBars(dailyBars: TrendBar[]): TrendBar[] {
  const byMonth = new Map<string, { sum: number; days: number; scrapes: number }>();

  for (const bar of dailyBars) {
    const monthKey = bar.key.slice(0, 7);
    const current = byMonth.get(monthKey) ?? { sum: 0, days: 0, scrapes: 0 };
    current.sum += bar.totalJobs;
    current.days += 1;
    current.scrapes += bar.scrapeCount ?? 0;
    byMonth.set(monthKey, current);
  }

  return [...byMonth.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([monthKey, stats]) => {
      const { label, shortLabel } = formatMonthLabel(monthKey);
      return {
        key: monthKey,
        label,
        shortLabel,
        totalJobs: Math.round(stats.sum / stats.days),
        dayCount: stats.days,
        scrapeCount: stats.scrapes,
      };
    });
}

export function trendDelta(bars: TrendBar[]): {
  current: number;
  previous: number;
  percent: number | null;
} | null {
  if (bars.length < 2) return null;
  const current = bars[bars.length - 1]!.totalJobs;
  const previous = bars[bars.length - 2]!.totalJobs;
  if (previous <= 0) {
    return { current, previous, percent: current > 0 ? 100 : 0 };
  }
  return {
    current,
    previous,
    percent: Math.round(((current - previous) / previous) * 100),
  };
}

export function formatTrendCount(value: number): string {
  if (value >= 10_000) return `${Math.round(value / 1000)}k`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
  return String(value);
}
