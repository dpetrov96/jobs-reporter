import type { JobRunRecord, ScrapeRegionId } from "@jobs-reporter/shared";
import {
  countActiveCountries,
  formatRunWhen,
  getScrapeRegion,
  humanizePostedWithin,
  isDailySummaryRun,
  listScrapeRegionOptions,
  normalizeRun,
} from "@jobs-reporter/shared";
import { useRegionSchedule } from "../hooks/useRegionSchedule";
import { DailySummaryBadge } from "./DailySummaryBadge";
import { RunNowButton } from "./RunNowButton";

function RegionMarketCard({
  regionId,
  active,
  run,
  isScanning,
  apiUrl,
  onSelect,
  onScanStart,
  onScanTriggered,
  onScanEnd,
}: {
  regionId: ScrapeRegionId;
  active: boolean;
  run: JobRunRecord | null;
  isScanning: boolean;
  apiUrl: string;
  onSelect: () => void;
  onScanStart?: () => void;
  onScanTriggered?: () => void;
  onScanEnd?: () => void;
}) {
  const config = getScrapeRegion(regionId);
  const schedule = useRegionSchedule(regionId);
  const option = listScrapeRegionOptions().find((item) => item.id === regionId)!;

  const isDaily = run ? isDailySummaryRun(run) : false;
  const stats = run
    ? (() => {
        const normalized = normalizeRun(run);
        const countriesWithJobs = countActiveCountries(run);
        return {
          when: isDaily && run.dayLabel ? run.dayLabel : formatRunWhen(run.fetchedAt),
          period: isDaily
            ? run.scrapeCount
              ? `${run.scrapeCount} scrapes`
              : "Today's scrapes"
            : humanizePostedWithin(normalized.postedWithinLabel),
          jobs: run.totalJobs,
          countries: `${countriesWithJobs}/${normalized.countryCount}`,
        };
      })()
    : null;

  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onSelect}
      className={`group flex min-w-0 flex-1 flex-col rounded-2xl p-3 text-left transition-all duration-200 sm:p-4 ${
        active
          ? "bg-white shadow-[0_1px_3px_rgba(0,0,0,0.08),0_1px_2px_rgba(0,0,0,0.04)] ring-2 ring-zinc-900/90"
          : "bg-zinc-50 ring-1 ring-zinc-200/80 hover:bg-zinc-100/80 hover:ring-zinc-300"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-base" aria-hidden>
              {option.flag}
            </span>
            <span className="truncate text-sm font-semibold text-zinc-900">{config.label}</span>
            {active ? (
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-800">
                Active
              </span>
            ) : null}
            {isDaily ? <DailySummaryBadge /> : null}
          </div>

          {isScanning ? (
            <p className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-zinc-700">
              <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-600" />
              Checking now…
            </p>
          ) : stats ? (
            <p className="mt-2 text-xs leading-relaxed text-zinc-600">
              <span className="font-semibold text-zinc-900">{stats.when}</span>
              <span className="mx-1.5 text-zinc-300">·</span>
              {stats.period}
              <span className="mx-1.5 text-zinc-300">·</span>
              <span className="tabular-nums">{stats.jobs}</span> jobs
              <span className="mx-1.5 text-zinc-300">·</span>
              <span className="tabular-nums">{stats.countries}</span> countries
            </p>
          ) : (
            <p className="mt-2 text-xs text-zinc-500">Not synced yet</p>
          )}
        </div>

        <RunNowButton
          apiUrl={apiUrl}
          scrapeRegion={regionId}
          compact
          onScanStart={onScanStart}
          onTriggered={onScanTriggered}
          onScanEnd={onScanEnd}
        />
      </div>

      <div
        className={`mt-3 rounded-xl px-2.5 py-2 text-[11px] leading-snug ${
          active ? "bg-emerald-50 text-emerald-900 ring-1 ring-emerald-200/70" : "bg-white/70 text-zinc-500 ring-1 ring-zinc-200/60"
        }`}
      >
        <span className={active ? "font-semibold text-emerald-800" : "font-medium text-zinc-600"}>
          {active ? "Live" : "Next scan"}
        </span>
        {" · Next auto-scan in "}
        <span className="tabular-nums font-semibold">{schedule.countdownLabel}</span>
        {" · "}
        {config.timezoneLabel} time
        {active && schedule.nearCronSlot ? (
          <span className="text-emerald-700"> · Checking for updates…</span>
        ) : null}
      </div>
    </button>
  );
}

export function RegionMarketPanel({
  apiUrl,
  activeRegion,
  runsByRegion,
  scanningRegion,
  onRegionChange,
  onScanStart,
  onScanTriggered,
  onScanEnd,
}: {
  apiUrl: string;
  activeRegion: ScrapeRegionId;
  runsByRegion: Record<ScrapeRegionId, JobRunRecord | null>;
  scanningRegion: ScrapeRegionId | null;
  onRegionChange: (region: ScrapeRegionId) => void;
  onScanStart?: (region: ScrapeRegionId) => void;
  onScanTriggered?: (region: ScrapeRegionId) => void;
  onScanEnd?: (region: ScrapeRegionId) => void;
}) {
  return (
    <section className="space-y-2" aria-label="Markets">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3" role="tablist">
        {(["europe", "usa"] as const).map((regionId) => (
          <RegionMarketCard
            key={regionId}
            regionId={regionId}
            active={activeRegion === regionId}
            run={runsByRegion[regionId]}
            isScanning={scanningRegion === regionId}
            apiUrl={apiUrl}
            onSelect={() => onRegionChange(regionId)}
            onScanStart={() => onScanStart?.(regionId)}
            onScanTriggered={() => onScanTriggered?.(regionId)}
            onScanEnd={() => onScanEnd?.(regionId)}
          />
        ))}
      </div>
    </section>
  );
}
