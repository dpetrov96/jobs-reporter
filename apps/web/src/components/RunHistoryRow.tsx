import { Link } from "react-router-dom";
import {
  encodeRunId,
  formatRunWhen,
  humanizePostedWithin,
  normalizeRun,
} from "@jobs-reporter/shared";
import type { JobRunRecord } from "@jobs-reporter/shared";
import { CountryFlag } from "./CountryFlag";

export function RunHistoryRow({ run }: { run: JobRunRecord }) {
  const normalized = normalizeRun(run);
  const countriesWithJobs = normalized.countries.filter((c) => c.totalJobs > 0).length;

  return (
    <Link
      to={`/runs/${encodeRunId(run.fetchedAt)}`}
      className="group block border-b border-zinc-200 py-4 transition hover:bg-zinc-50/80 sm:-mx-2 sm:rounded-lg sm:border-b-0 sm:border-transparent sm:px-2"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="font-medium text-zinc-900 group-hover:text-[#0a66c2]">
            {formatRunWhen(run.fetchedAt)}
          </div>
          <div className="mt-0.5 text-xs text-zinc-500">
            {humanizePostedWithin(run.postedWithinLabel)} · {run.totalJobs} jobs · {countriesWithJobs}{" "}
            countries
          </div>
        </div>
        <span className="shrink-0 rounded-lg bg-zinc-100 px-2.5 py-1 text-sm font-semibold tabular-nums text-zinc-900">
          {run.totalJobs}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {normalized.countries.map((country) => (
          <span
            key={country.code}
            className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs ${
              country.totalJobs > 0
                ? "bg-zinc-100 text-zinc-700"
                : "bg-zinc-50 text-zinc-400"
            }`}
          >
            <CountryFlag code={country.code} location={country.location} flag={country.flag} size="sm" />
            <span className="font-medium tabular-nums">{country.totalJobs}</span>
          </span>
        ))}
      </div>
    </Link>
  );
}
