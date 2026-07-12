import { Link } from "react-router-dom";
import { companiesPagePath } from "../lib/companyLinks";
import { CountryFlag } from "./CountryFlag";

export type CountryFilterOption = {
  code: string;
  location: string;
  flag: string;
};

function tabClass(isActive: boolean) {
  return [
    "relative inline-flex shrink-0 cursor-pointer items-center gap-1.5 px-3 py-2.5 text-sm font-medium transition sm:px-4",
    isActive ? "text-zinc-900" : "text-zinc-500 hover:text-zinc-800",
  ].join(" ");
}

export function CompanyCountryFilter({
  analysisId,
  countries,
  activeCountryCode,
  totalCount,
  filteredCount,
  missingDomainsByCountry,
}: {
  analysisId: string;
  countries: CountryFilterOption[];
  activeCountryCode?: string;
  totalCount: number;
  filteredCount: number;
  missingDomainsByCountry?: Map<string, number>;
}) {
  const allActive = !activeCountryCode;

  return (
    <div className="border-b border-zinc-200 bg-white">
      <div className="flex overflow-x-auto px-4 sm:px-6 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <Link to={companiesPagePath(analysisId)} className={tabClass(allActive)}>
          All markets
          <span className="rounded-full bg-zinc-100 px-1.5 py-0.5 text-[10px] tabular-nums text-zinc-500">
            {totalCount.toLocaleString()}
          </span>
          {allActive ? (
            <span className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-[#0a66c2] sm:inset-x-4" />
          ) : null}
        </Link>

        {countries.map((country) => {
          const isActive = activeCountryCode === country.code;
          const missingCount = missingDomainsByCountry?.get(country.code);

          return (
            <Link
              key={country.code}
              to={companiesPagePath(analysisId, country.code)}
              className={tabClass(isActive)}
            >
              <CountryFlag
                code={country.code}
                location={country.location}
                flag={country.flag}
                size="sm"
              />
              <span className="whitespace-nowrap">{country.location}</span>
              {missingCount ? (
                <span
                  className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] tabular-nums text-amber-800"
                  title={`${missingCount} without website domain`}
                >
                  {missingCount}
                </span>
              ) : null}
              {isActive ? (
                <span className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-[#0a66c2] sm:inset-x-4" />
              ) : null}
            </Link>
          );
        })}
      </div>

      <p className="px-4 py-2 text-xs text-zinc-500 sm:px-6">
        {filteredCount.toLocaleString()} companies
        {activeCountryCode
          ? ` in ${countries.find((c) => c.code === activeCountryCode)?.location ?? activeCountryCode}`
          : " across all markets"}
      </p>
    </div>
  );
}
