import type { JobRunRecord } from "@jobs-reporter/shared";
import { countActiveCountries, formatRunDate, normalizeRun } from "@jobs-reporter/shared";
import { CountryBlock } from "./CountryBlock";

export function RunReport({ run }: { run: JobRunRecord }) {
  const normalized = normalizeRun(run);
  const activeCountries = countActiveCountries(normalized);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm sm:flex-row sm:items-start sm:justify-between dark:border-zinc-800 dark:bg-zinc-900">
        <div>
          <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
            {formatRunDate(normalized.fetchedAt)}
          </h2>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            {normalized.location} · {normalized.postedWithinLabel} · {normalized.totalJobs} jobs ·{" "}
            {activeCountries}/{normalized.countryCount} active countries
          </p>
        </div>
        <span
          className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-medium ${
            normalized.emailSent
              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
              : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
          }`}
        >
          {normalized.emailSent ? "✓ Email sent" : normalized.emailReason ?? "Email skipped"}
        </span>
      </div>

      <div className="space-y-3">
        {normalized.countries.map((country) => (
          <CountryBlock
            key={country.code + country.location}
            country={country}
            postedWithinLabel={normalized.postedWithinLabel}
            defaultOpen={country.totalJobs > 0}
          />
        ))}
      </div>
    </div>
  );
}
