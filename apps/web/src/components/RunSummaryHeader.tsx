import type { JobRunRecord } from "@jobs-reporter/shared";
import {
  countActiveCountries,
  formatRunWhen,
  humanizePostedWithin,
  normalizeRun,
} from "@jobs-reporter/shared";
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
  onRefreshed,
}: {
  run: JobRunRecord;
  apiUrl?: string;
  onRefreshed?: () => void;
}) {
  const normalized = normalizeRun(run);
  const countriesWithJobs = countActiveCountries(run);
  const period = humanizePostedWithin(normalized.postedWithinLabel);

  return (
    <header className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5 rounded-lg bg-zinc-50 px-2.5 py-2 ring-1 ring-zinc-200/70 sm:px-3">
      <p className="min-w-0 text-xs leading-snug text-zinc-600">
        <span className="font-semibold text-zinc-900">{formatRunWhen(run.fetchedAt)}</span>
        <Dot />
        {period}
        <span className="hidden sm:inline">
          <Dot />
          <span className="tabular-nums">{run.totalJobs}</span> jobs
          <Dot />
          <span className="tabular-nums">{countriesWithJobs}</span>/
          <span className="tabular-nums">{normalized.countryCount}</span> countries
        </span>
      </p>

      <div className="flex shrink-0 items-center gap-2">
        <p className="text-[11px] tabular-nums text-zinc-500 sm:hidden">
          {run.totalJobs} jobs · {countriesWithJobs}/{normalized.countryCount}
        </p>
        {apiUrl ? (
          <RunNowButton apiUrl={apiUrl} compact onTriggered={onRefreshed} />
        ) : null}
      </div>
    </header>
  );
}
