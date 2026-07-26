import { useMemo } from "react";
import type { CountryRunResult, JobRunRecord } from "@jobs-reporter/shared";
import {
  countActiveCountries,
  formatRunWhen,
  normalizeRun,
  sortByCountryDisplayOrder,
} from "@jobs-reporter/shared";
import { CountryFlag } from "./CountryFlag";
import { CountryPanel } from "./CountryPanel";
import { DailySummaryBadge } from "./DailySummaryBadge";
import { OpenContractJobsButton } from "./OpenContractJobsButton";

function countryDisplayName(country: CountryRunResult): string {
  return country.code === "GB" ? "United Kingdom" : country.location;
}

function CountrySection({ country, periodLabel }: { country: CountryRunResult; periodLabel: string }) {
  const hasJobs = country.totalJobs > 0;

  return (
    <section className="overflow-hidden rounded-2xl ring-1 ring-zinc-200/80">
      <div className="flex items-center gap-2 border-b border-zinc-200/80 bg-white px-3 py-2.5 sm:px-4">
        <CountryFlag code={country.code} location={country.location} flag={country.flag} size="sm" />
        <h2 className="min-w-0 flex-1 truncate text-sm font-medium text-zinc-900">
          {countryDisplayName(country)}
        </h2>
        <span
          className={`min-w-[1.5rem] rounded-md px-2 py-0.5 text-center text-[11px] font-semibold tabular-nums ${
            hasJobs ? "bg-zinc-900 text-white" : "bg-zinc-200 text-zinc-500"
          }`}
        >
          {country.totalJobs}
        </span>
      </div>

      {hasJobs ? (
        <CountryPanel country={country} postedWithinLabel={periodLabel} />
      ) : (
        <p className="px-4 py-6 text-center text-sm text-zinc-400">No jobs</p>
      )}
    </section>
  );
}

export function DaySectionsReport({ run }: { run: JobRunRecord }) {
  const normalized = normalizeRun(run);
  const countries = useMemo(
    () => sortByCountryDisplayOrder(normalized.countries),
    [normalized.countries]
  );
  const countriesWithJobs = countActiveCountries(run);
  const periodLabel = run.scrapeCount ? `${run.scrapeCount} scrapes` : "today's scrapes";

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-zinc-200/80 bg-zinc-50 px-3 py-2.5 text-xs leading-relaxed text-zinc-600 sm:px-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <DailySummaryBadge />
            {run.dayLabel ? <span className="font-semibold text-zinc-900">{run.dayLabel}</span> : null}
          </div>
          <OpenContractJobsButton run={run} />
        </div>
        <p className="mt-1">
          <span className="font-semibold text-zinc-900">{formatRunWhen(run.fetchedAt)}</span>
          <span className="mx-1.5 text-zinc-300">·</span>
          {periodLabel}
          <span className="mx-1.5 text-zinc-300">·</span>
          <span className="font-semibold text-zinc-900 tabular-nums">{run.totalJobs}</span> unique jobs
          <span className="mx-1.5 text-zinc-300">·</span>
          <span className="font-semibold text-zinc-900 tabular-nums">{countriesWithJobs}</span>/
          {countries.length} countries
        </p>
      </div>

      <div className="space-y-4">
        {countries.map((country) => (
          <CountrySection key={country.code} country={country} periodLabel={periodLabel} />
        ))}
      </div>
    </div>
  );
}
