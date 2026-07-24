import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  fetchRuns,
  getScrapeRegion,
  isDailySummaryRun,
  isJobRunRecord,
} from "@jobs-reporter/shared";
import type { JobRunRecord } from "@jobs-reporter/shared";
import { RegionTabs } from "../components/RegionTabs";
import { TrendCountryFilter } from "../components/TrendCountryFilter";
import { TrendsBarChart } from "../components/TrendsBarChart";
import { useScrapeRegion } from "../hooks/useScrapeRegion";
import {
  buildDailyTrendBars,
  buildMonthlyTrendBars,
  listTrendCountries,
  trendDelta,
  type TrendBar,
  type TrendGranularity,
} from "../lib/dailyTrends";

const PAGE_SIZE = 50;

function LoadingState({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 py-8 text-sm text-zinc-400">
      <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-zinc-300 border-t-transparent" />
      {label}
    </div>
  );
}

function GranularityToggle({
  value,
  onChange,
}: {
  value: TrendGranularity;
  onChange: (value: TrendGranularity) => void;
}) {
  const options: Array<{ id: TrendGranularity; label: string }> = [
    { id: "day", label: "By day" },
    { id: "month", label: "By month" },
  ];

  return (
    <div
      className="inline-flex rounded-2xl bg-zinc-100/90 p-1 ring-1 ring-zinc-200/70"
      role="tablist"
      aria-label="Chart period"
    >
      {options.map((option) => {
        const active = option.id === value;
        return (
          <button
            key={option.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(option.id)}
            className={`rounded-xl px-3.5 py-2 text-sm font-medium transition active:scale-[0.97] ${
              active
                ? "bg-white text-zinc-900 shadow-sm ring-1 ring-zinc-200/80"
                : "text-zinc-600 hover:text-zinc-900"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

function DeltaBadge({
  percent,
  granularity,
}: {
  percent: number;
  granularity: TrendGranularity;
}) {
  const up = percent > 0;
  const flat = percent === 0;
  const period = granularity === "day" ? "vs previous day" : "vs previous month";

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium tabular-nums ${
        flat
          ? "bg-zinc-100 text-zinc-600"
          : up
            ? "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-100"
            : "bg-rose-50 text-rose-800 ring-1 ring-rose-100"
      }`}
    >
      {flat ? "→" : up ? "↑" : "↓"} {flat ? "Flat" : `${Math.abs(percent)}%`}{" "}
      <span className="font-normal opacity-80">{period}</span>
    </span>
  );
}

export function TrendsPage({ apiUrl }: { apiUrl: string }) {
  const { region, setRegion } = useScrapeRegion();
  const [granularity, setGranularity] = useState<TrendGranularity>("day");
  const [countryCode, setCountryCode] = useState<string | null>(null);
  const [runs, setRuns] = useState<JobRunRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const collected: JobRunRecord[] = [];
      let cursor: string | undefined;

      do {
        const response = await fetchRuns(apiUrl, {
          limit: PAGE_SIZE,
          scrapeRegion: region,
          reportKind: "daily",
          ...(cursor ? { cursor } : {}),
        });
        collected.push(...response.runs.filter(isJobRunRecord).filter(isDailySummaryRun));
        cursor = response.nextCursor;
      } while (cursor);

      setRuns(collected);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load daily summaries");
      setRuns([]);
    } finally {
      setLoading(false);
    }
  }, [apiUrl, region]);

  useEffect(() => {
    setCountryCode(null);
    void load();
  }, [load]);

  const countries = useMemo(() => listTrendCountries(runs), [runs]);

  useEffect(() => {
    if (countryCode && !countries.some((country) => country.code === countryCode)) {
      setCountryCode(null);
    }
  }, [countries, countryCode]);

  const dailyBars = useMemo(
    () => buildDailyTrendBars(runs, countryCode),
    [runs, countryCode]
  );
  const monthlyBars = useMemo(() => buildMonthlyTrendBars(dailyBars), [dailyBars]);
  const bars = granularity === "day" ? dailyBars : monthlyBars;
  const delta = trendDelta(bars);
  const regionLabel = getScrapeRegion(region).label;
  const selectedCountry = countries.find((country) => country.code === countryCode);
  const scopeLabel = selectedCountry
    ? selectedCountry.code === "GB"
      ? "United Kingdom"
      : selectedCountry.location
    : regionLabel;
  const latestAll = useMemo(() => {
    const allBars = buildDailyTrendBars(runs, null);
    return allBars[allBars.length - 1]?.totalJobs ?? 0;
  }, [runs]);
  const latest = bars[bars.length - 1];
  const peak = bars.reduce<TrendBar | null>(
    (best, bar) => (!best || bar.totalJobs > best.totalJobs ? bar : best),
    null
  );

  return (
    <main className="mx-auto max-w-3xl px-3 py-3 sm:px-6 sm:py-5 lg:max-w-4xl">
      <header className="border-b border-zinc-200 pb-4">
        <Link to="/history" className="text-xs text-zinc-400 transition hover:text-zinc-600">
          ← Previous runs
        </Link>
        <h1 className="mt-2 text-lg font-semibold text-zinc-900 sm:text-xl">Market trends</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Open listings from daily summaries · {scopeLabel}
        </p>
      </header>

      <div className="mt-4 space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <RegionTabs activeRegion={region} onChange={setRegion} />
          <GranularityToggle value={granularity} onChange={setGranularity} />
        </div>
        {!loading ? (
          <TrendCountryFilter
            countries={countries}
            activeCode={countryCode}
            allTotal={latestAll}
            onChange={setCountryCode}
          />
        ) : null}
      </div>

      {error ? <div className="py-4 text-sm text-red-600">{error}</div> : null}

      {loading ? (
        <LoadingState label="Loading daily summaries…" />
      ) : (
        <section className="mt-5 space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">
                {granularity === "day" ? "Daily open jobs" : "Avg open jobs / day"}
              </p>
              <p className="mt-1 text-3xl font-semibold tabular-nums tracking-tight text-zinc-900">
                {latest ? latest.totalJobs.toLocaleString() : "—"}
              </p>
              <p className="mt-1 text-xs text-zinc-500">
                {latest
                  ? granularity === "day"
                    ? latest.label
                    : `${latest.label} · ${latest.dayCount ?? 0} days`
                  : "No data"}
              </p>
            </div>
            {delta?.percent != null ? (
              <DeltaBadge percent={delta.percent} granularity={granularity} />
            ) : null}
          </div>

          <div className="rounded-2xl bg-zinc-50/80 px-2 py-4 ring-1 ring-zinc-200/70 sm:px-4">
            <TrendsBarChart
              bars={bars}
              unitLabel={granularity === "month" ? "jobs/day avg" : "jobs"}
            />
          </div>

          {peak && bars.length > 0 ? (
            <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
              <div className="rounded-xl bg-white px-3 py-2.5 ring-1 ring-zinc-200/80">
                <dt className="text-[11px] text-zinc-500">Days covered</dt>
                <dd className="mt-0.5 font-semibold tabular-nums text-zinc-900">
                  {dailyBars.length}
                </dd>
              </div>
              <div className="rounded-xl bg-white px-3 py-2.5 ring-1 ring-zinc-200/80">
                <dt className="text-[11px] text-zinc-500">Peak</dt>
                <dd className="mt-0.5 font-semibold tabular-nums text-zinc-900">
                  {peak.totalJobs.toLocaleString()}
                </dd>
                <dd className="text-[11px] text-zinc-500">{peak.shortLabel}</dd>
              </div>
              <div className="col-span-2 rounded-xl bg-white px-3 py-2.5 ring-1 ring-zinc-200/80 sm:col-span-1">
                <dt className="text-[11px] text-zinc-500">
                  {granularity === "day" ? "Latest day" : "Latest month avg"}
                </dt>
                <dd className="mt-0.5 font-semibold tabular-nums text-zinc-900">
                  {latest ? latest.totalJobs.toLocaleString() : "—"}
                </dd>
              </div>
            </dl>
          ) : null}

          <p className="text-[11px] leading-relaxed text-zinc-400">
            Totals come from saved daily summaries. Pick a country to chart that market only.
            Monthly view averages daily totals so months with fewer days stay comparable. Tap a bar
            to see its exact value.
          </p>
        </section>
      )}
    </main>
  );
}
