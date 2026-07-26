import { useEffect, useMemo, useState } from "react";
import type { JobRunRecord } from "@jobs-reporter/shared";
import { isDailySummaryRun, normalizeRun } from "@jobs-reporter/shared";
import { CountryPanel } from "./CountryPanel";
import { CountryTabs } from "./CountryTabs";
import { DaySectionsReport } from "./DaySectionsReport";
import { ScanStatusBanner } from "./ScanStatusBanner";

function defaultCountryCode(countries: ReturnType<typeof normalizeRun>["countries"]): string {
  const withJobs = countries.find((c) => c.totalJobs > 0);
  return withJobs?.code ?? countries[0]?.code ?? "";
}

export function RunReport({
  run,
  isScanning = false,
}: {
  run: JobRunRecord;
  isScanning?: boolean;
}) {
  const normalized = normalizeRun(run);
  const countries = normalized.countries;
  const isDaily = isDailySummaryRun(run);
  const [activeCode, setActiveCode] = useState(() => defaultCountryCode(countries));

  useEffect(() => {
    setActiveCode(defaultCountryCode(normalizeRun(run).countries));
  }, [run.fetchedAt]);

  const activeCountry = useMemo(
    () => countries.find((c) => c.code === activeCode) ?? countries[0],
    [countries, activeCode]
  );

  const periodLabel = isDaily
    ? run.scrapeCount
      ? `${run.scrapeCount} scrapes`
      : "today's scrapes"
    : normalized.postedWithinLabel;

  if (isDaily) {
    return <DaySectionsReport run={run} />;
  }

  return (
    <div className="space-y-3">
      <div className="sticky top-0 z-10 -mx-3 border-b border-zinc-200/80 bg-white/80 px-3 py-3 backdrop-blur-md sm:-mx-0 sm:px-0 sm:py-4">
        <CountryTabs countries={countries} activeCode={activeCode} onChange={setActiveCode} />
      </div>

      {activeCountry ? (
        <div role="tabpanel">
          <CountryPanel
            key={activeCountry.code}
            country={activeCountry}
            postedWithinLabel={periodLabel}
            isScanning={isScanning}
          />
        </div>
      ) : isScanning ? (
        <ScanStatusBanner message="Checking job market…" />
      ) : null}
    </div>
  );
}
