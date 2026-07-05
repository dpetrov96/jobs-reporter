import { useEffect, useMemo, useState } from "react";
import type { JobRunRecord } from "@jobs-reporter/shared";
import {
  countActiveCountries,
  formatRunDate,
  normalizeRun,
} from "@jobs-reporter/shared";
import { CountryPanel } from "./CountryPanel";
import { CountryTabs } from "./CountryTabs";

function defaultCountryCode(countries: ReturnType<typeof normalizeRun>["countries"]): string {
  const withJobs = countries.find((c) => c.totalJobs > 0);
  return withJobs?.code ?? countries[0]?.code ?? "";
}

export function RunReport({ run }: { run: JobRunRecord }) {
  const normalized = normalizeRun(run);
  const countries = normalized.countries;
  const [activeCode, setActiveCode] = useState(() => defaultCountryCode(countries));

  useEffect(() => {
    setActiveCode(defaultCountryCode(normalizeRun(run).countries));
  }, [run.fetchedAt]);

  const activeCountry = useMemo(
    () => countries.find((c) => c.code === activeCode) ?? countries[0],
    [countries, activeCode],
  );

  const activeCount = countActiveCountries(run);

  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="rounded-2xl border border-zinc-100 bg-zinc-50/60 p-3.5 sm:p-4">
        <p className="text-sm font-semibold text-zinc-900 sm:text-base">
          {formatRunDate(run.fetchedAt)}
        </p>
        <p className="mt-0.5 text-xs text-zinc-500">{normalized.postedWithinLabel}</p>

        <div className="mt-3 grid grid-cols-3 gap-2 sm:mt-4 sm:gap-3">
          <Stat label="Jobs" value={run.totalJobs} />
          <Stat label="Active" value={activeCount} />
          <Stat label="Scanned" value={normalized.countryCount} />
        </div>
      </div>

      <div className="sticky top-0 z-10 -mx-3 border-b border-zinc-100 bg-white/95 px-3 py-2.5 backdrop-blur-sm sm:-mx-0 sm:px-0 sm:py-3">
        <CountryTabs countries={countries} activeCode={activeCode} onChange={setActiveCode} />
      </div>

      {activeCountry ? (
        <div role="tabpanel" className="pt-1">
          <CountryPanel
            key={activeCountry.code}
            country={activeCountry}
            postedWithinLabel={normalized.postedWithinLabel}
          />
        </div>
      ) : null}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-white px-2.5 py-2 text-center ring-1 ring-zinc-100 sm:px-3 sm:py-2.5">
      <p className="text-lg font-bold tabular-nums text-zinc-900 sm:text-xl">{value}</p>
      <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-400 sm:text-[11px]">
        {label}
      </p>
    </div>
  );
}
