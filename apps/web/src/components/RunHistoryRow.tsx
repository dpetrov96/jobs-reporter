import { Link } from "react-router-dom";
import {
  encodeRunId,
  formatRunWhen,
  humanizePostedWithin,
  isDailySummaryRun,
  normalizeRun,
} from "@jobs-reporter/shared";
import type { JobRunRecord } from "@jobs-reporter/shared";
import { CountryFlag } from "./CountryFlag";
import { DailySummaryBadge } from "./DailySummaryBadge";

export function RunHistoryRow({ run }: { run: JobRunRecord }) {
  const normalized = normalizeRun(run);
  const countriesWithJobs =
    run.countryCount ??
    normalized.countries.filter((c) => c.totalJobs > 0).length;
  const isDaily = isDailySummaryRun(run);
  const whenLabel = isDaily && run.dayLabel ? run.dayLabel : formatRunWhen(run.fetchedAt);
  const period = isDaily
    ? run.scrapeCount
      ? `${run.scrapeCount} scrapes`
      : "Today's scrapes"
    : humanizePostedWithin(run.postedWithinLabel);
  const countryChips = normalized.countries.filter(
    (country) => country.totalJobs > 0 || (country.categories?.length ?? 0) > 0
  );

  return (
    <Link
      to={`/runs/${encodeRunId(run.fetchedAt)}`}
      className={`group block border-b py-4 transition sm:-mx-2 sm:rounded-lg sm:border-b-0 sm:px-2 ${
        isDaily
          ? "border-sky-100 bg-sky-50/60 hover:bg-sky-50 sm:ring-1 sm:ring-sky-200/80"
          : "border-zinc-200 hover:bg-zinc-50/80 sm:border-transparent"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            {isDaily ? (
              <span
                className="inline-block h-2 w-2 shrink-0 rounded-full bg-sky-500"
                aria-hidden
              />
            ) : null}
            <div
              className={`font-medium group-hover:text-[#0a66c2] ${
                isDaily ? "text-sky-950" : "text-zinc-900"
              }`}
            >
              {whenLabel}
            </div>
            {isDaily ? <DailySummaryBadge /> : null}
          </div>
          <div className={`mt-0.5 text-xs ${isDaily ? "text-sky-800/70" : "text-zinc-500"}`}>
            {isDaily ? "Full-day summary · " : null}
            {period} · {run.totalJobs} jobs · {countriesWithJobs} countries
          </div>
        </div>
        <span
          className={`shrink-0 rounded-lg px-2.5 py-1 text-sm font-semibold tabular-nums ${
            isDaily
              ? "bg-sky-100 text-sky-900 ring-1 ring-sky-200/80"
              : "bg-zinc-100 text-zinc-900"
          }`}
        >
          {run.totalJobs}
        </span>
      </div>

      {countryChips.length > 0 ? (
      <div className="mt-3 flex flex-wrap gap-1.5">
        {countryChips.map((country) => (
          <span
            key={country.code}
            className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs ${
              country.totalJobs > 0
                ? isDaily
                  ? "bg-white/80 text-sky-900 ring-1 ring-sky-100"
                  : "bg-zinc-100 text-zinc-700"
                : "bg-zinc-50 text-zinc-400"
            }`}
          >
            <CountryFlag code={country.code} location={country.location} flag={country.flag} size="sm" />
            <span className="font-medium tabular-nums">{country.totalJobs}</span>
          </span>
        ))}
      </div>
      ) : null}
    </Link>
  );
}
