import { useEffect, useState } from "react";
import type { CompanyHiringItem } from "@jobs-reporter/shared";
import { getCountryFlag } from "@jobs-reporter/shared";
import { getCompanyLinkMeta, getCompanyWebsiteMeta } from "../lib/companyLinks";
import { CompanyLogoThumb } from "./CompanyLogoThumb";
import { CountryFlag } from "./CountryFlag";

export const COMPANIES_PAGE_SIZE = 50;

function CompanyMarkets({
  countries,
  countryLabels,
}: {
  countries?: CompanyHiringItem["countries"];
  countryLabels?: Map<string, string>;
}) {
  if (!countries?.length) {
    return <span className="text-zinc-400">—</span>;
  }

  return (
    <div className="flex flex-wrap gap-1">
      {countries.map((entry) => {
        const label = countryLabels?.get(entry.code) ?? entry.code;
        const flag = getCountryFlag(entry.code, label);

        return (
          <span
            key={entry.code}
            className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] text-zinc-600"
            title={`${label}: ${entry.count} listings`}
          >
            <CountryFlag code={entry.code} location={label} flag={flag} size="sm" />
            <span className="tabular-nums">{entry.count}</span>
          </span>
        );
      })}
    </div>
  );
}

export function CompaniesTable({
  companies,
  countryLabels,
}: {
  companies: CompanyHiringItem[];
  countryLabels?: Map<string, string>;
}) {
  const [page, setPage] = useState(0);
  const totalPages = Math.max(1, Math.ceil(companies.length / COMPANIES_PAGE_SIZE));

  useEffect(() => {
    setPage(0);
  }, [companies]);

  useEffect(() => {
    if (page >= totalPages) {
      setPage(Math.max(0, totalPages - 1));
    }
  }, [page, totalPages]);

  if (companies.length === 0) {
    return (
      <p className="px-4 py-16 text-center text-sm text-zinc-400 sm:px-6">
        No companies in this market
      </p>
    );
  }

  const start = page * COMPANIES_PAGE_SIZE;
  const pageItems = companies.slice(start, start + COMPANIES_PAGE_SIZE);

  return (
    <div className="w-full">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-100 px-4 py-3 sm:px-6">
        <p className="text-sm tabular-nums text-zinc-600">
          {start + 1}–{Math.min(start + COMPANIES_PAGE_SIZE, companies.length)} of{" "}
          {companies.length.toLocaleString()}
        </p>

        <div className="flex items-center gap-3">
          <span className="text-xs tabular-nums text-zinc-400">
            Page {page + 1} of {totalPages}
          </span>
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => setPage((current) => Math.max(0, current - 1))}
              disabled={page === 0}
              className="cursor-pointer px-2.5 py-1 text-xs font-medium text-zinc-600 transition hover:text-zinc-900 disabled:opacity-30"
            >
              ← Prev
            </button>
            <button
              type="button"
              onClick={() => setPage((current) => Math.min(totalPages - 1, current + 1))}
              disabled={page >= totalPages - 1}
              className="cursor-pointer px-2.5 py-1 text-xs font-medium text-zinc-600 transition hover:text-zinc-900 disabled:opacity-30"
            >
              Next →
            </button>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-zinc-200 text-left text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
              <th className="w-12 px-4 py-3 pl-4 sm:pl-6">#</th>
              <th className="px-4 py-3">Company</th>
              <th className="w-28 px-4 py-3">Listings</th>
              <th className="min-w-[140px] px-4 py-3">Markets</th>
              <th className="w-36 px-4 py-3">Domain</th>
              <th className="w-28 px-4 py-3 pr-4 sm:pr-6">Profile</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
              {pageItems.map((company, index) => {
                const profileLink = getCompanyLinkMeta(company.url);
                const website = getCompanyWebsiteMeta(company.domain);
                const rank = start + index + 1;

              return (
                <tr key={company.name} className="transition hover:bg-zinc-50/60">
                  <td className="px-4 py-3 pl-4 tabular-nums text-zinc-400 sm:pl-6">{rank}</td>
                  <td className="px-4 py-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <CompanyLogoThumb
                        company={company.name}
                        logoUrl={company.logoUrl}
                        url={company.url}
                        size="sm"
                      />
                      <span className="font-medium text-zinc-900">{company.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 tabular-nums font-medium text-zinc-800">
                    {company.count.toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <CompanyMarkets
                      countries={company.countries}
                      countryLabels={countryLabels}
                    />
                  </td>
                    <td className="px-4 py-3">
                      {website ? (
                        <a
                          href={website.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs font-medium text-[#0a66c2] hover:underline"
                        >
                          {website.domain}
                          <span aria-hidden>↗</span>
                        </a>
                      ) : (
                        <span className="text-zinc-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 pr-4 sm:pr-6">
                      {profileLink ? (
                        <a
                          href={profileLink.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="cursor-pointer text-xs font-medium text-zinc-600 transition hover:text-[#0a66c2]"
                        >
                          {profileLink.label} ↗
                        </a>
                      ) : (
                        <span className="text-zinc-400">—</span>
                      )}
                    </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
