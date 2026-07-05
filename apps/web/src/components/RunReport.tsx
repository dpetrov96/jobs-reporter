import type { JobRunRecord } from "@jobs-reporter/shared";
import { normalizeRun } from "@jobs-reporter/shared";
import { CountryBlock } from "./CountryBlock";

export function RunReport({ run }: { run: JobRunRecord }) {
  const normalized = normalizeRun(run);

  return (
    <div>
      {normalized.countries.map((country) => (
        <CountryBlock
          key={country.code + country.location}
          country={country}
          postedWithinLabel={normalized.postedWithinLabel}
          defaultOpen={country.totalJobs > 0}
        />
      ))}
    </div>
  );
}
