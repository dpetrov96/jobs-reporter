import type { CountryRunResult } from "@jobs-reporter/shared";
import { CountryFlag } from "./CountryFlag";

export function CountryTabs({
  countries,
  activeCode,
  onChange,
}: {
  countries: CountryRunResult[];
  activeCode: string;
  onChange: (code: string) => void;
}) {
  return (
    <div className="-mx-3 overflow-x-auto px-3 [scrollbar-width:none] sm:-mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden">
      <div
        className="flex min-w-max snap-x snap-mandatory gap-1 border-b border-transparent sm:min-w-0 sm:flex-wrap sm:gap-0"
        role="tablist"
        aria-label="Countries"
      >
        {countries.map((country) => {
          const active = country.code === activeCode;
          const hasJobs = country.totalJobs > 0;

          return (
            <button
              key={country.code}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onChange(country.code)}
              className={`inline-flex min-h-11 snap-start items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm transition sm:min-h-0 sm:gap-2 sm:px-4 sm:py-3 ${
                active
                  ? "border-[#0a66c2] font-semibold text-[#0a66c2]"
                  : hasJobs
                    ? "border-transparent font-medium text-zinc-600 hover:text-zinc-900"
                    : "border-transparent font-medium text-zinc-400 hover:text-zinc-600"
              }`}
            >
              <CountryFlag
                code={country.code}
                location={country.location}
                flag={country.flag}
                size="sm"
              />
              <span className="max-w-[7rem] truncate sm:max-w-none">
                <span className="sm:hidden">{country.code}</span>
                <span className="hidden sm:inline">{country.location}</span>
              </span>
              <span
                className={`text-xs tabular-nums sm:text-sm ${
                  active ? "text-[#0a66c2]" : hasJobs ? "text-zinc-500" : "text-zinc-400"
                }`}
              >
                ({country.totalJobs})
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
