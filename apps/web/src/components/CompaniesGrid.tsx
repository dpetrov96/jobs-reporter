import { useEffect, useState } from "react";
import type { CompanyHiringItem } from "@jobs-reporter/shared";
import { getCountryFlag } from "@jobs-reporter/shared";
import { CompanyLogoThumb } from "./CompanyLogoThumb";
import { CountryFlag } from "./CountryFlag";

export const COMPANIES_PAGE_SIZE = 40;

type ColumnMode = 3 | 4;

const COLUMN_CLASS: Record<ColumnMode, string> = {
  3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
  4: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4",
};

function CompanyCountryBadges({
  countries,
  countryLabels,
}: {
  countries?: CompanyHiringItem["countries"];
  countryLabels?: Map<string, string>;
}) {
  if (!countries?.length) {
    return <span className="text-[10px] text-zinc-400">—</span>;
  }

  return (
    <div className="flex flex-wrap items-center gap-1">
      {countries.map((entry) => {
        const label = countryLabels?.get(entry.code) ?? entry.code;
        const flag = getCountryFlag(entry.code, label);

        return (
          <span
            key={entry.code}
            className="inline-flex items-center gap-0.5 rounded bg-zinc-100 px-1 py-px text-[10px] text-zinc-600"
            title={`${label}: ${entry.count} listings`}
          >
            <CountryFlag code={entry.code} location={label} flag={flag} size="sm" />
            <span className="font-medium">{entry.code}</span>
            <span className="tabular-nums text-zinc-400">{entry.count}</span>
          </span>
        );
      })}
    </div>
  );
}

function CompanyCard({
  company,
  rank,
  countryLabels,
}: {
  company: CompanyHiringItem;
  rank: number;
  countryLabels?: Map<string, string>;
}) {
  return (
    <article className="flex flex-col gap-2 rounded-lg border border-zinc-200 bg-white p-3 shadow-sm transition hover:border-zinc-300 hover:shadow">
      <div className="flex items-start gap-2.5">
        <span className="w-6 shrink-0 pt-0.5 text-right text-[11px] tabular-nums text-zinc-400">
          {rank}
        </span>
        <CompanyLogoThumb
          company={company.name}
          logoUrl={company.logoUrl}
          url={company.url}
          size="sm"
        />
        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 text-sm font-medium leading-snug text-zinc-900" title={company.name}>
            {company.name}
          </p>
          <p className="mt-1 text-xs tabular-nums text-zinc-500">
            {company.count} {company.count === 1 ? "listing" : "listings"}
          </p>
        </div>
      </div>

      <CompanyCountryBadges countries={company.countries} countryLabels={countryLabels} />
    </article>
  );
}

export function CompaniesGrid({
  companies,
  countryLabels,
}: {
  companies: CompanyHiringItem[];
  countryLabels?: Map<string, string>;
}) {
  const [page, setPage] = useState(0);
  const [columns, setColumns] = useState<ColumnMode>(3);

  const totalPages = Math.max(1, Math.ceil(companies.length / COMPANIES_PAGE_SIZE));

  useEffect(() => {
    setPage(0);
  }, [companies.length]);

  useEffect(() => {
    if (page >= totalPages) {
      setPage(Math.max(0, totalPages - 1));
    }
  }, [page, totalPages]);

  if (companies.length === 0) {
    return <p className="text-sm text-zinc-400">No company data</p>;
  }

  const start = page * COMPANIES_PAGE_SIZE;
  const pageItems = companies.slice(start, start + COMPANIES_PAGE_SIZE);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-100 pb-3">
        <p className="text-sm tabular-nums text-zinc-600">
          {start + 1}–{Math.min(start + COMPANIES_PAGE_SIZE, companies.length)} of{" "}
          {companies.length.toLocaleString()}
        </p>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-lg bg-zinc-100 p-0.5">
            {([3, 4] as ColumnMode[]).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setColumns(mode)}
                className={`rounded-md px-3 py-1 text-xs font-medium transition ${
                  columns === mode
                    ? "bg-white text-zinc-900 shadow-sm"
                    : "text-zinc-500 hover:text-zinc-800"
                }`}
              >
                {mode} cols
              </button>
            ))}
          </div>

          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={() => setPage((current) => Math.max(0, current - 1))}
              disabled={page === 0}
              className="rounded-lg border border-zinc-200 px-3 py-1 text-xs font-medium text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-40"
            >
              ← Prev
            </button>
            <button
              type="button"
              onClick={() => setPage((current) => Math.min(totalPages - 1, current + 1))}
              disabled={page >= totalPages - 1}
              className="rounded-lg border border-zinc-200 px-3 py-1 text-xs font-medium text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-40"
            >
              Next →
            </button>
          </div>
        </div>
      </div>

      <div className={`mt-4 grid gap-3 ${COLUMN_CLASS[columns]}`}>
        {pageItems.map((company, index) => (
          <CompanyCard
            key={company.name}
            company={company}
            rank={start + index + 1}
            countryLabels={countryLabels}
          />
        ))}
      </div>

      <p className="mt-4 text-center text-xs tabular-nums text-zinc-400">
        Page {page + 1} of {totalPages}
      </p>
    </div>
  );
}

export function CompaniesPreview({
  companies,
  countryLabels,
  limit = 12,
}: {
  companies: CompanyHiringItem[];
  countryLabels?: Map<string, string>;
  limit?: number;
}) {
  const preview = companies.slice(0, limit);

  if (preview.length === 0) {
    return <p className="text-xs text-zinc-400">No company data</p>;
  }

  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
      {preview.map((company, index) => (
        <CompanyCard
          key={company.name}
          company={company}
          rank={index + 1}
          countryLabels={countryLabels}
        />
      ))}
    </div>
  );
}
