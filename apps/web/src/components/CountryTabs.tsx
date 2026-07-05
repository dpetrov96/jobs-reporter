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
    <div className="-mx-3 overflow-x-auto px-3 pb-0.5 [scrollbar-width:none] sm:-mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden">
      <div
        className="flex min-w-max snap-x snap-mandatory gap-2 sm:flex-wrap sm:min-w-0"
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
              className={`inline-flex min-h-11 snap-start items-center gap-1.5 rounded-xl border px-3 py-2.5 text-sm transition active:scale-[0.98] sm:min-h-0 sm:gap-2 sm:py-2 ${
                active
                  ? "border-emerald-300 bg-emerald-50 text-emerald-900 shadow-sm ring-1 ring-emerald-200"
                  : hasJobs
                    ? "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300"
                    : "border-zinc-100 bg-zinc-50 text-zinc-400"
              }`}
            >
              <CountryFlag
                code={country.code}
                location={country.location}
                flag={country.flag}
                size="sm"
              />
              <span className="max-w-[7rem] truncate font-medium sm:max-w-none">
                <span className="sm:hidden">{country.code}</span>
                <span className="hidden sm:inline">{country.location}</span>
              </span>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-bold tabular-nums sm:text-[11px] ${
                  active
                    ? "bg-emerald-200 text-emerald-900"
                    : hasJobs
                      ? "bg-zinc-100 text-zinc-700"
                      : "bg-zinc-100/80 text-zinc-400"
                }`}
              >
                {country.totalJobs}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
