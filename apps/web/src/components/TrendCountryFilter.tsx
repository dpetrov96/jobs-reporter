import { CountryFlag } from "./CountryFlag";
import type { TrendCountryOption } from "../lib/dailyTrends";

export function TrendCountryFilter({
  countries,
  activeCode,
  allTotal,
  onChange,
}: {
  countries: TrendCountryOption[];
  /** null = all markets */
  activeCode: string | null;
  allTotal: number;
  onChange: (code: string | null) => void;
}) {
  if (countries.length <= 1) return null;

  return (
    <div className="-mx-3 px-3 sm:-mx-0 sm:px-0">
      <div
        className="flex flex-wrap gap-1.5 rounded-2xl bg-zinc-100/90 p-1.5 ring-1 ring-zinc-200/70"
        role="tablist"
        aria-label="Market within region"
      >
        <button
          type="button"
          role="tab"
          aria-selected={activeCode == null}
          onClick={() => onChange(null)}
          className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium transition active:scale-[0.97] ${
            activeCode == null
              ? "bg-white text-zinc-900 shadow-sm ring-1 ring-zinc-200/80"
              : "text-zinc-600 hover:bg-white/60 hover:text-zinc-900"
          }`}
        >
          All
          <span
            className={`rounded-md px-1.5 py-0.5 text-[11px] font-semibold tabular-nums ${
              activeCode == null ? "bg-zinc-900 text-white" : "bg-zinc-200/80 text-zinc-700"
            }`}
          >
            {allTotal}
          </span>
        </button>

        {countries.map((country) => {
          const active = country.code === activeCode;
          return (
            <button
              key={country.code}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onChange(country.code)}
              className={`inline-flex items-center gap-1.5 rounded-xl px-2.5 py-2 text-sm font-medium transition active:scale-[0.97] ${
                active
                  ? "bg-white text-zinc-900 shadow-sm ring-1 ring-zinc-200/80"
                  : "text-zinc-600 hover:bg-white/60 hover:text-zinc-900"
              }`}
            >
              <CountryFlag
                code={country.code}
                location={country.location}
                flag={country.flag}
                size="sm"
              />
              <span className="whitespace-nowrap">
                {country.code === "GB" ? "UK" : country.code}
              </span>
              <span
                className={`rounded-md px-1.5 py-0.5 text-[11px] font-semibold tabular-nums ${
                  active ? "bg-zinc-900 text-white" : "bg-zinc-200/80 text-zinc-700"
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
