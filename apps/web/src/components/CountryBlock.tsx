import type { CountryRunResult } from "@jobs-reporter/shared";
import { CategoryBlock } from "./CategoryBlock";
import { CountryFlag } from "./CountryFlag";

export function CountryBlock({
  country,
  postedWithinLabel,
  defaultOpen,
}: {
  country: CountryRunResult;
  postedWithinLabel: string;
  defaultOpen?: boolean;
}) {
  const hasJobs = country.totalJobs > 0;

  return (
    <details
      className="group overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
      open={defaultOpen ?? hasJobs}
    >
      <summary className="flex cursor-pointer list-none items-center gap-3 border-l-4 border-emerald-500 bg-zinc-50 px-4 py-3 transition hover:bg-emerald-50/60 dark:bg-zinc-900 dark:hover:bg-emerald-950/30 [&::-webkit-details-marker]:hidden">
        <CountryFlag code={country.code} location={country.location} flag={country.flag} size="lg" />
        <div className="min-w-0 flex-1">
          <div className="font-semibold text-zinc-900 dark:text-zinc-50">{country.location}</div>
          <div className="text-xs text-zinc-500 dark:text-zinc-400">{country.code}</div>
        </div>
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
            hasJobs
              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
              : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
          }`}
        >
          {country.totalJobs}
        </span>
        <span className="details-chevron text-zinc-400">▾</span>
      </summary>

      <div className="space-y-2 border-t border-zinc-100 p-3 dark:border-zinc-800">
        {country.categories.map((category) => (
          <CategoryBlock
            key={category.keyword}
            category={category}
            postedWithinLabel={postedWithinLabel}
            fallbackLocation={country.code}
            compact
          />
        ))}
      </div>
    </details>
  );
}
