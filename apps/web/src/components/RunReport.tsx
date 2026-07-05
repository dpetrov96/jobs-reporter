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
    <div>
      <header className="border-b border-zinc-200 pb-4">
        <h1 className="text-lg font-semibold text-zinc-900 sm:text-xl">
          {formatRunDate(run.fetchedAt)}
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          {normalized.postedWithinLabel}
          <span className="mx-2 text-zinc-300" aria-hidden>
            ·
          </span>
          <span className="tabular-nums">{run.totalJobs} jobs</span>
          <span className="mx-2 text-zinc-300" aria-hidden>
            ·
          </span>
          <span className="tabular-nums">{activeCount} active</span>
          <span className="mx-2 text-zinc-300" aria-hidden>
            ·
          </span>
          <span className="tabular-nums">{normalized.countryCount} scanned</span>
        </p>
      </header>

      <div className="sticky top-0 z-10 -mx-3 border-b border-zinc-200 bg-white px-3 py-2 sm:-mx-0 sm:px-0 sm:py-3">
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
