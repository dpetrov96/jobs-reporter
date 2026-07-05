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
      <p className="py-10 text-center text-sm text-zinc-500">
        No jobs in {country.location} · nothing posted {postedWithinLabel}
      </p>
    );
  }

  return (
    <div className="divide-y divide-zinc-200">
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
