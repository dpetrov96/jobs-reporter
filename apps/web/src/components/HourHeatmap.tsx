import { formatHourLabel } from "@jobs-reporter/shared";

interface HourHeatmapProps {
  hours: Array<{ hour: number; count: number }>;
  peakStart?: number;
  peakEnd?: number;
}

function formatHourRange(hour: number): string {
  const next = (hour + 1) % 24;
  return `${formatHourLabel(hour)}–${formatHourLabel(next)}`;
}

function LegendItem({ color, label, tooltip }: { color: string; label: string; tooltip: string }) {
  return (
    <span className="group/legend relative inline-flex items-center gap-1.5">
      <span className={`h-2.5 w-2.5 shrink-0 rounded-sm ${color}`} aria-hidden />
      <span className="cursor-help border-b border-dotted border-zinc-300 text-[10px] text-zinc-600">
        {label}
      </span>
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-0 z-20 mb-1.5 hidden w-44 rounded-lg border border-zinc-200 bg-white px-2.5 py-2 text-[10px] leading-snug text-zinc-600 shadow-lg group-hover/legend:block"
      >
        {tooltip}
      </span>
    </span>
  );
}

function HourCell({
  hour,
  count,
  max,
  inPeak,
}: {
  hour: number;
  count: number;
  max: number;
  inPeak: boolean;
}) {
  const intensity = count / max;
  const share = max > 0 ? Math.round((count / max) * 100) : 0;

  return (
    <div className="group/cell relative flex min-w-0 flex-1 flex-col items-center gap-1">
      <div
        className={`h-10 w-full cursor-help rounded-md transition hover:scale-y-110 ${
          inPeak ? "ring-2 ring-[#0a66c2]/50 ring-offset-1" : "hover:ring-1 hover:ring-zinc-300"
        }`}
        style={{
          backgroundColor:
            count === 0
              ? "#f4f4f5"
              : `rgba(10, 102, 194, ${0.12 + intensity * 0.78})`,
        }}
        aria-label={`${formatHourRange(hour)}: ${count} positions opened`}
      />

      <span className="text-[9px] tabular-nums text-zinc-400">{String(hour).padStart(2, "0")}</span>

      <div
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 z-30 mb-2 hidden w-52 -translate-x-1/2 rounded-xl border border-zinc-200 bg-white p-3 text-left shadow-xl group-hover/cell:block"
      >
        <p className="text-[11px] font-semibold text-zinc-900">{formatHourRange(hour)} Sofia</p>
        <p className="mt-1 text-[10px] text-zinc-500">When employers posted new jobs</p>
        <dl className="mt-2 space-y-1 text-[10px]">
          <div className="flex justify-between gap-3">
            <dt className="text-zinc-500">Positions opened</dt>
            <dd className="font-semibold tabular-nums text-zinc-900">{count}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-zinc-500">Vs busiest hour</dt>
            <dd className="font-semibold tabular-nums text-zinc-900">{share}%</dd>
          </div>
          {inPeak ? (
            <div className="mt-1 rounded-md bg-blue-50 px-2 py-1 text-blue-800">
              In the busiest 3-hour posting window
            </div>
          ) : count === 0 ? (
            <div className="mt-1 text-zinc-400">No openings recorded this hour</div>
          ) : null}
        </dl>
      </div>
    </div>
  );
}

export function HourHeatmap({ hours, peakStart, peakEnd }: HourHeatmapProps) {
  const max = Math.max(...hours.map((item) => item.count), 1);
  const total = hours.reduce((sum, item) => sum + item.count, 0);
  const active = hours.filter((item) => item.count > 0);

  if (active.length === 0) {
    return <p className="text-xs text-zinc-400">No job posting times recorded</p>;
  }

  const peakHour = hours.reduce(
    (best, item) => (item.count > best.count ? item : best),
    hours[0] ?? { hour: 0, count: 0 }
  );

  return (
    <div>
      <p className="mb-3 text-xs leading-relaxed text-zinc-600">
        <span className="font-medium text-zinc-800">24-hour view</span> — each column is one hour.
        Height and color show how many{" "}
        <span className="font-medium">new positions were published on LinkedIn</span> during that
        hour (Sofia time). Hover any hour for details.
      </p>

      <div className="mb-1 flex justify-between text-[9px] font-medium uppercase tracking-wide text-zinc-400">
        <span>00:00</span>
        <span>12:00</span>
        <span>23:00</span>
      </div>

      <div className="flex gap-0.5 sm:gap-1">
        {hours.map((item) => {
          const inPeak =
            peakStart != null &&
            peakEnd != null &&
            item.hour >= peakStart &&
            item.hour <= peakEnd;

          return (
            <HourCell
              key={item.hour}
              hour={item.hour}
              count={item.count}
              max={max}
              inPeak={inPeak}
            />
          );
        })}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-zinc-100 pt-3">
        <LegendItem
          color="bg-zinc-100"
          label="No openings"
          tooltip="No new job listings were posted during this hour in the dataset."
        />
        <LegendItem
          color="bg-[#0a66c2]/30"
          label="Some openings"
          tooltip="Employers posted a few new positions — lighter blue means fewer postings."
        />
        <LegendItem
          color="bg-[#0a66c2]"
          label="Many openings"
          tooltip="Darker blue = more positions opened that hour compared to other hours."
        />
        <LegendItem
          color="ring-2 ring-[#0a66c2]/50 bg-[#0a66c2]/40"
          label="Busiest window"
          tooltip="Blue ring marks the consecutive 3-hour block with the most job postings."
        />
      </div>

      <p className="mt-3 text-[10px] text-zinc-500">
        Peak hour: <span className="font-medium text-zinc-700">{formatHourLabel(peakHour.hour)}</span>{" "}
        ({peakHour.count} openings) · Total tracked:{" "}
        <span className="tabular-nums font-medium text-zinc-700">{total.toLocaleString()}</span>{" "}
        postings in this market
      </p>
    </div>
  );
}
