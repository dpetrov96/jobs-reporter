import type { CompanyHiringItem, PositionHiringStat } from "@jobs-reporter/shared";
import { CompanyLogoThumb } from "./CompanyLogoThumb";
import { DistributionBar } from "./DistributionBar";

function CompanyLogoTooltip({
  company,
  max,
}: {
  company: CompanyHiringItem;
  max: number;
}) {
  const width = max > 0 ? Math.max((company.count / max) * 100, company.count > 0 ? 8 : 0) : 0;

  return (
    <div className="group relative">
      <CompanyLogoThumb
        company={company.name}
        logoUrl={company.logoUrl}
        url={company.url}
        size="sm"
      />

      <div className="pointer-events-none absolute bottom-full right-0 z-30 mb-2 hidden w-44 rounded-lg border border-zinc-200 bg-white p-2.5 shadow-lg group-hover:block">
        <p className="truncate text-xs font-medium text-zinc-900">{company.name}</p>
        <p className="mt-0.5 text-[10px] tabular-nums text-zinc-500">
          {company.count} listings
        </p>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-zinc-100">
          <div
            className="h-full rounded-full bg-[#0a66c2]"
            style={{ width: `${width}%` }}
          />
        </div>
      </div>
    </div>
  );
}

function PositionCompanyLogos({ companies }: { companies: CompanyHiringItem[] }) {
  if (companies.length === 0) return null;

  const max = companies[0]?.count ?? 1;

  return (
    <div className="flex shrink-0 items-center gap-1 pl-1">
      {companies.map((company) => (
        <CompanyLogoTooltip key={company.name} company={company} max={max} />
      ))}
    </div>
  );
}

export function PositionsRankedList({ items }: { items: PositionHiringStat[] }) {
  if (items.length === 0) {
    return <p className="text-sm text-zinc-400">No data</p>;
  }

  const max = items[0]?.count ?? 1;

  return (
    <div className="space-y-2">
      {items.map((item, index) => (
        <div key={item.label} className="flex items-center gap-2">
          <div className="min-w-0 flex-1">
            <DistributionBar
              label={item.label}
              count={item.count}
              max={max}
              rank={index + 1}
            />
          </div>
          {item.topCompanies?.length ? (
            <PositionCompanyLogos companies={item.topCompanies} />
          ) : null}
        </div>
      ))}
    </div>
  );
}
