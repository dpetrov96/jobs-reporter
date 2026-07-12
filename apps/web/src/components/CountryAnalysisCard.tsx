import type { CountryAnalysisResult } from "@jobs-reporter/shared";
import {
  dayLabel,
  formatHourLabel,
  normalizeCalendarDayLabel,
  normalizeWeekdayLabel,
} from "@jobs-reporter/shared";
import { CountryDataSection } from "./CountryDataSection";
import { DistributionBar, RankedList } from "./DistributionBar";
import { HourHeatmap } from "./HourHeatmap";
import {
  PresentationBlockHeader,
  PresentationCountryHeader,
} from "./PresentationHeader";
import { PositionsRankedList } from "./PositionsRankedList";
import { TopCompaniesStrip } from "./TopCompaniesStrip";

function InsightStat({
  label,
  value,
  hint,
  accent = "zinc",
}: {
  label: string;
  value: string;
  hint?: string;
  accent?: "blue" | "emerald" | "amber" | "zinc";
}) {
  const accents = {
    blue: "border-blue-100 bg-blue-50/80 text-blue-900",
    emerald: "border-emerald-100 bg-emerald-50/80 text-emerald-900",
    amber: "border-amber-100 bg-amber-50/80 text-amber-900",
    zinc: "border-zinc-200 bg-zinc-50 text-zinc-900",
  };

  return (
    <div className={`rounded-xl border px-3 py-3 ${accents[accent]}`}>
      <p className="text-[10px] font-bold uppercase tracking-wider opacity-70">{label}</p>
      <p className="mt-1.5 text-base font-semibold tabular-nums">{value}</p>
      {hint ? <p className="mt-1.5 text-[10px] leading-snug opacity-70">{hint}</p> : null}
    </div>
  );
}

export function CountryAnalysisCard({ country }: { country: CountryAnalysisResult }) {
  const hourlyDistribution = country.hourlyDistribution ?? [];
  const dailyDistribution = country.dailyDistribution ?? [];
  const topPositions = country.topPositions ?? [];
  const topTechnologies = country.topTechnologies ?? [];
  const topCalendarDays = country.topCalendarDays ?? [];
  const topWeekdays = country.topWeekdays ?? [];
  const peakHourRange = country.peakHourRange ?? formatHourLabel(country.peakHour);

  const maxDaily = Math.max(...dailyDistribution.map((item) => item.count), 1);

  const sortedWeekdays =
    topWeekdays.length > 0
      ? topWeekdays.map((item) => ({
          label: normalizeWeekdayLabel(item.label),
          count: item.count,
        }))
      : [...dailyDistribution]
          .sort((a, b) => b.count - a.count)
          .map((item) => ({ label: dayLabel(item.day), count: item.count }));

  const calendarDays = topCalendarDays.map((item) => ({
    label: normalizeCalendarDayLabel(item.label),
    count: item.count,
  }));

  return (
    <article className="scroll-mt-28 overflow-hidden rounded-2xl border border-zinc-200/90 border-t-[3px] border-t-emerald-500 bg-white shadow-sm">
      <PresentationCountryHeader
        code={country.code}
        location={country.location}
        flag={country.flag}
        totalJobs={country.totalJobs}
      >
        <p className="rounded-lg bg-zinc-50 px-3 py-2 text-[11px] leading-relaxed text-zinc-600 ring-1 ring-zinc-100">
          <span className="font-semibold text-zinc-800">When positions open</span> — times below
          show when employers publish new listings on LinkedIn (Sofia), not when candidates apply.
        </p>
        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
          <InsightStat
            label="Peak posting hour"
            value={formatHourLabel(country.peakHour)}
            hint="Single hour with most LinkedIn postings"
            accent="blue"
          />
          <InsightStat
            label="Busiest posting window"
            value={peakHourRange}
            hint="3-hour block with most openings"
            accent="emerald"
          />
          <InsightStat
            label="Peak opening day"
            value={normalizeWeekdayLabel(country.peakDay)}
            hint="Weekday with most new listings"
            accent="amber"
          />
        </div>
      </PresentationCountryHeader>

      <div className="space-y-5 bg-zinc-50/40 p-5 sm:p-6">
        <CountryDataSection
          title="Top employers"
          subtitle="Companies with the most new job postings in this market"
          tone="blue"
        >
          <TopCompaniesStrip companies={country.topCompanies ?? []} />
        </CountryDataSection>

        <div className="grid gap-5 lg:grid-cols-2">
          <CountryDataSection title="Top roles" subtitle="Ranked by search keyword volume" tone="emerald">
            <PositionsRankedList items={topPositions.slice(0, 8)} />
          </CountryDataSection>

          <CountryDataSection
            title="Technologies"
            subtitle="Most mentioned in job descriptions"
            tone="violet"
          >
            <RankedList items={topTechnologies.slice(0, 10)} />
          </CountryDataSection>
        </div>

        <div className="overflow-hidden rounded-2xl border border-zinc-200/80 bg-white p-4 sm:p-5">
          <PresentationBlockHeader
            kicker="Timing"
            title="Job opening times"
            subtitle="When employers post new positions on LinkedIn · Sofia timezone"
            tone="blue"
          />

          <div className="space-y-5">
            <CountryDataSection
              title="When jobs get posted each hour"
              subtitle="Hover any hour column for exact posting counts"
              tone="blue"
            >
              <HourHeatmap
                hours={hourlyDistribution}
                peakStart={country.peakHourRangeStart}
                peakEnd={country.peakHourRangeEnd}
              />
            </CountryDataSection>

            <div className="grid gap-5 lg:grid-cols-3">
              <CountryDataSection
                title="Openings by weekday"
                subtitle="New listings published per day of week"
                tone="emerald"
              >
                <div className="space-y-1">
                  {dailyDistribution.map((item) => (
                    <DistributionBar
                      key={item.day}
                      label={dayLabel(item.day)}
                      count={item.count}
                      max={maxDaily}
                    />
                  ))}
                </div>
              </CountryDataSection>

              <CountryDataSection
                title="Busiest calendar days"
                subtitle="Dates with the most new openings"
                tone="amber"
              >
                {calendarDays.length === 0 ? (
                  <p className="text-xs text-zinc-400">No calendar data</p>
                ) : (
                  <RankedList items={calendarDays.slice(0, 7)} />
                )}
              </CountryDataSection>

              {sortedWeekdays.some((item) => item.count > 0) ? (
                <CountryDataSection
                  title="Weekday ranking"
                  subtitle="Ranked by number of positions opened"
                  tone="zinc"
                >
                  <RankedList items={sortedWeekdays} />
                </CountryDataSection>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
