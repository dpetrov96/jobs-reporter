import { useMemo } from "react";
import type { CountryRunResult } from "@jobs-reporter/shared";
import { sortByCountryDisplayOrder } from "@jobs-reporter/shared";
import { CountryFlag } from "./CountryFlag";

export function CountryTabs({
  countries,
  activeCode,
  onChange,
}: {
  countries: CountryRunResult[];
  activeCode: string;
  onChange: (code: string) => void;
}) {
  const sorted = useMemo(() => sortByCountryDisplayOrder(countries), [countries]);
  const withJobsCount = sorted.filter((c) => c.totalJobs > 0).length;

  return (
    <div className="space-y-2.5">
      <div className="flex items-baseline justify-between gap-3 px-0.5">
        <p className="text-[13px] font-medium text-zinc-800">Countries</p>
        <p className="text-xs text-zinc-400">
          {withJobsCount}/{sorted.length} with jobs
        </p>
      </div>

      <div className="country-tab-scroll -mx-3 px-3 sm:-mx-0 sm:px-0">
        <div
          className="country-tab-track inline-flex min-w-max snap-x snap-mandatory gap-1 rounded-2xl bg-zinc-100/90 p-1 ring-1 ring-zinc-200/70"
          role="tablist"
          aria-label="Countries"
        >
          {sorted.map((country) => {
            const active = country.code === activeCode;
            const hasJobs = country.totalJobs > 0;

            return (
              <button
                key={country.code}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => onChange(country.code)}
                className={`country-tab snap-start inline-flex shrink-0 items-center gap-2 rounded-xl px-3 py-2.5 text-sm transition-all duration-200 active:scale-[0.97] sm:px-3.5 sm:py-2 ${
                  active
                    ? "country-tab-active bg-white text-zinc-900 shadow-[0_1px_3px_rgba(0,0,0,0.08),0_1px_2px_rgba(0,0,0,0.04)] ring-1 ring-zinc-200/80"
                    : hasJobs
                      ? "text-zinc-600 hover:bg-white/60 hover:text-zinc-900"
                      : "text-zinc-400 hover:bg-white/40 hover:text-zinc-500"
                }`}
              >
                <CountryFlag
                  code={country.code}
                  location={country.location}
                  flag={country.flag}
                  size="sm"
                  className={active ? "" : hasJobs ? "" : "opacity-60"}
                />
                <span className="whitespace-nowrap font-medium">
                  <span className="sm:hidden">{country.code === "GB" ? "UK" : country.code}</span>
                  <span className="hidden sm:inline">
                    {country.code === "GB" ? "United Kingdom" : country.location}
                  </span>
                </span>
                <span
                  className={`min-w-[1.25rem] rounded-md px-1.5 py-0.5 text-center text-[11px] font-semibold tabular-nums leading-none ${
                    active
                      ? hasJobs
                        ? "bg-zinc-900 text-white"
                        : "bg-zinc-200 text-zinc-500"
                      : hasJobs
                        ? "bg-zinc-200/80 text-zinc-700"
                        : "bg-zinc-200/50 text-zinc-400"
                  }`}
                >
                  {country.totalJobs}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
