import type { JobRunRecord } from "@jobs-reporter/shared";
import {
  countActiveCountries,
  formatRunWhen,
  humanizePostedWithin,
  isDailySummaryRun,
  normalizeRun,
} from "@jobs-reporter/shared";
import { DailySummaryBadge } from "./DailySummaryBadge";
import { RunNowButton } from "./RunNowButton";

function Dot() {
  return (
    <span className="mx-1.5 text-zinc-300" aria-hidden>
      ·
    </span>
  );
}

export function RunSummaryHeader({
  run,
  apiUrl,
  scrapeRegion = "europe",
  isScanning = false,
  onScanStart,
  onScanTriggered,
  onScanEnd,
}: {
  run: JobRunRecord;
  apiUrl?: string;
  scrapeRegion?: "europe" | "usa";
  isScanning?: boolean;
  onScanStart?: () => void;
  onScanTriggered?: () => void;
  onScanEnd?: () => void;
}) {
  const normalized = normalizeRun(run);
  const countriesWithJobs = countActiveCountries(run);
  const isDaily = isDailySummaryRun(run);
  const whenLabel = isDaily && run.dayLabel ? run.dayLabel : formatRunWhen(run.fetchedAt);
  const period = isDaily
    ? run.scrapeCount
      ? `${run.scrapeCount} scrapes`
      : "Today's scrapes"
    : humanizePostedWithin(normalized.postedWithinLabel);

  return (
    <header className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5 rounded-lg bg-zinc-50 px-2.5 py-2 ring-1 ring-zinc-200/70 sm:px-3">
      <p className="min-w-0 text-xs leading-snug text-zinc-600">
        {isScanning ? (
          <span className="inline-flex items-center gap-1.5 font-semibold text-zinc-900">
            <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-600" />
            Checking now…
          </span>
        ) : (
          <>
            <span className="inline-flex flex-wrap items-center gap-2">
              <span className="font-semibold text-zinc-900">{whenLabel}</span>
              {isDaily ? <DailySummaryBadge /> : null}
            </span>
            <Dot />
            {period}
            <span className="hidden sm:inline">
              <Dot />
              <span className="tabular-nums">{run.totalJobs}</span> jobs
              <Dot />
              <span className="tabular-nums">{countriesWithJobs}</span>/
              <span className="tabular-nums">{normalized.countryCount}</span> countries
            </span>
          </>
        )}
      </p>

      <div className="flex shrink-0 items-center gap-2">
        {!isScanning ? (
          <p className="text-[11px] tabular-nums text-zinc-500 sm:hidden">
            {run.totalJobs} jobs · {countriesWithJobs}/{normalized.countryCount}
          </p>
        ) : null}
        {apiUrl && scrapeRegion === "europe" ? (
          <RunNowButton
            apiUrl={apiUrl}
            compact
            onScanStart={onScanStart}
            onTriggered={onScanTriggered}
            onScanEnd={onScanEnd}
          />
        ) : null}
      </div>
    </header>
  );
}
