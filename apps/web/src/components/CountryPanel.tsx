import { useMemo } from "react";
import type { CountryRunResult } from "@jobs-reporter/shared";
import { CompanyGroup } from "./CompanyGroup";
import { groupJobsByCompany } from "../utils/groupByCompany";

export function CountryPanel({
  country,
  postedWithinLabel,
}: {
  country: CountryRunResult;
  postedWithinLabel: string;
}) {
  const companyGroups = useMemo(
    () => groupJobsByCompany(country.categories),
    [country.categories],
  );

  if (country.totalJobs === 0) {
    return (
      <p className="py-10 text-center text-sm text-zinc-500">
        No jobs in {country.location} · nothing posted {postedWithinLabel}
      </p>
    );
  }

  return (
    <div className="divide-y divide-zinc-200">
      {companyGroups.map((group) => (
        <CompanyGroup
          key={group.company.toLowerCase()}
          group={group}
          fallbackLocation={country.code}
        />
      ))}
    </div>
  );
}
