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
  const categoriesWithJobs = country.categories.filter((c) => c.jobs.length > 0);

  if (!hasJobs) {
    return (
      <details className="group border-b border-zinc-100" open={false}>
        <summary className="flex cursor-pointer list-none items-center gap-2.5 py-4 [&::-webkit-details-marker]:hidden">
          <CountryFlag code={country.code} location={country.location} flag={country.flag} size="md" />
          <span className="font-medium text-zinc-800">{country.location}</span>
          <span className="text-sm text-zinc-400">0</span>
          <span className="details-chevron ml-auto text-xs text-zinc-300">▾</span>
        </summary>
        <p className="pb-4 pl-8 text-sm text-zinc-400">No jobs in {postedWithinLabel}.</p>
      </details>
    );
  }

  return (
    <details className="group border-b border-zinc-100" open={defaultOpen ?? true}>
      <summary className="flex cursor-pointer list-none items-center gap-2.5 py-4 [&::-webkit-details-marker]:hidden">
        <CountryFlag code={country.code} location={country.location} flag={country.flag} size="md" />
        <span className="font-medium text-zinc-900">{country.location}</span>
        <span className="text-sm tabular-nums text-zinc-500">{country.totalJobs}</span>
        <span className="details-chevron ml-auto text-xs text-zinc-400">▾</span>
      </summary>

      <div className="pb-4">
        {categoriesWithJobs.map((category) => (
          <CategoryBlock
            key={category.keyword}
            category={category}
            postedWithinLabel={postedWithinLabel}
            fallbackLocation={country.code}
            flat
          />
        ))}
      </div>
    </details>
  );
}
