import type { CountryRunResult } from "@jobs-reporter/shared";
import { CategoryBlock } from "./CategoryBlock";

export function CountryPanel({
  country,
  postedWithinLabel,
}: {
  country: CountryRunResult;
  postedWithinLabel: string;
}) {
  if (country.totalJobs === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/50 px-4 py-10 text-center sm:py-12">
        <p className="text-sm font-medium text-zinc-600">No jobs in {country.location}</p>
        <p className="mt-1 text-xs text-zinc-400">Nothing posted {postedWithinLabel}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-5">
      {country.categories.map((category, index) => (
        <CategoryBlock
          key={category.keyword}
          category={category}
          postedWithinLabel={postedWithinLabel}
          fallbackLocation={country.code}
          themeIndex={index}
        />
      ))}
    </div>
  );
}
