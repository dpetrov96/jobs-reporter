import type { CompanyHiringItem } from "@jobs-reporter/shared";
import { CompanyLogoThumb } from "./CompanyLogoThumb";

export function TopCompaniesStrip({ companies }: { companies: CompanyHiringItem[] }) {
  if (companies.length === 0) {
    return <p className="text-sm text-zinc-400">No company data</p>;
  }

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-5">
      {companies.map((company, index) => (
        <div
          key={company.name}
          className="flex flex-col items-center gap-2 rounded-xl border border-zinc-100 bg-zinc-50/50 p-3 transition hover:border-zinc-200 hover:bg-white hover:shadow-sm"
        >
          <span className="self-start text-[10px] font-medium tabular-nums text-zinc-400">
            #{index + 1}
          </span>
          <CompanyLogoThumb
            company={company.name}
            logoUrl={company.logoUrl}
            url={company.url}
            size="lg"
            title={`${company.name} · ${company.count} listings`}
          />
          <div className="w-full text-center">
            <p
              className="line-clamp-2 text-[11px] font-medium leading-tight text-zinc-800"
              title={company.name}
            >
              {company.name}
            </p>
            <p className="mt-1 text-xs tabular-nums font-semibold text-[#0a66c2]">
              {company.count}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
