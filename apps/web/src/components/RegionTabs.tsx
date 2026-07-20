import type { ScrapeRegionId } from "@jobs-reporter/shared";
import { listScrapeRegionOptions } from "@jobs-reporter/shared";

function tabClass(isActive: boolean) {
  return `inline-flex shrink-0 snap-start items-center gap-2 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all duration-200 active:scale-[0.97] sm:px-4 ${
    isActive
      ? "bg-white text-zinc-900 shadow-[0_1px_3px_rgba(0,0,0,0.08),0_1px_2px_rgba(0,0,0,0.04)] ring-1 ring-zinc-200/80"
      : "text-zinc-600 hover:bg-white/60 hover:text-zinc-900"
  }`;
}

export function RegionTabs({
  activeRegion,
  onChange,
}: {
  activeRegion: ScrapeRegionId;
  onChange: (region: ScrapeRegionId) => void;
}) {
  const regions = listScrapeRegionOptions();

  return (
    <div className="-mx-3 px-3 sm:-mx-0 sm:px-0">
      <div
        className="inline-flex min-w-max snap-x snap-mandatory gap-1 rounded-2xl bg-zinc-100/90 p-1 ring-1 ring-zinc-200/70"
        role="tablist"
        aria-label="Markets"
      >
        {regions.map((region) => {
          const active = region.id === activeRegion;

          return (
            <button
              key={region.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onChange(region.id)}
              className={tabClass(active)}
            >
              <span aria-hidden>{region.flag}</span>
              <span className="whitespace-nowrap">
                <span className="sm:hidden">{region.id === "usa" ? "USA" : "EU"}</span>
                <span className="hidden sm:inline">{region.label}</span>
              </span>
              <span className="hidden text-[11px] font-normal text-zinc-500 sm:inline">
                · {region.timezoneLabel}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
