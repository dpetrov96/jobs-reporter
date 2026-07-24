import { useState } from "react";
import { formatTrendCount, type TrendBar } from "../lib/dailyTrends";

export function TrendsBarChart({
  bars,
  unitLabel = "jobs",
}: {
  bars: TrendBar[];
  unitLabel?: string;
}) {
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  if (bars.length === 0) {
    return (
      <p className="py-12 text-center text-sm text-zinc-400">No daily summaries to chart yet.</p>
    );
  }

  const max = Math.max(...bars.map((bar) => bar.totalJobs), 1);
  const selected = bars.find((bar) => bar.key === selectedKey) ?? bars[bars.length - 1]!;

  function detailFor(bar: TrendBar): string {
    if (bar.dayCount != null) {
      return `${bar.dayCount} day${bar.dayCount === 1 ? "" : "s"} · avg ${bar.totalJobs.toLocaleString()} ${unitLabel}`;
    }
    return `${bar.totalJobs.toLocaleString()} ${unitLabel}${
      bar.scrapeCount ? ` · ${bar.scrapeCount} scrapes` : ""
    }`;
  }

  return (
    <div className="space-y-3">
      <div
        className="grid items-end gap-x-1 gap-y-3 pt-1"
        style={{
          gridTemplateColumns: `repeat(${bars.length}, minmax(0, 1fr))`,
        }}
        role="img"
        aria-label={`Bar chart of ${unitLabel} over time`}
      >
        {bars.map((bar) => {
          const heightPct = Math.max((bar.totalJobs / max) * 100, bar.totalJobs > 0 ? 3 : 0);
          const isSelected = bar.key === selected.key;

          return (
            <button
              key={bar.key}
              type="button"
              onClick={() => setSelectedKey(bar.key)}
              className="flex min-w-0 flex-col items-center gap-1 rounded-lg px-0.5 py-1 text-left transition hover:bg-white/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#0a66c2]"
              aria-pressed={isSelected}
              aria-label={`${bar.label}: ${detailFor(bar)}`}
              title={`${bar.label}: ${detailFor(bar)}`}
            >
              <span
                className={`w-full text-center text-[9px] font-semibold leading-none tabular-nums sm:text-[10px] ${
                  isSelected ? "text-zinc-900" : "text-zinc-600"
                }`}
              >
                {formatTrendCount(bar.totalJobs)}
              </span>

              <div className="flex h-40 w-full items-end sm:h-48">
                <div
                  className={`w-full rounded-t-md transition ${
                    isSelected
                      ? "bg-[#0a66c2] ring-2 ring-[#0a66c2]/30 ring-offset-1"
                      : "bg-gradient-to-t from-[#0a66c2] to-[#5aabb8] ring-1 ring-[#0a66c2]/15"
                  }`}
                  style={{ height: `${heightPct}%` }}
                />
              </div>

              <span
                className={`w-full text-center text-[9px] leading-tight sm:text-[10px] ${
                  isSelected ? "font-medium text-zinc-800" : "text-zinc-500"
                }`}
              >
                {bar.shortLabel}
              </span>
            </button>
          );
        })}
      </div>

      <div className="rounded-xl bg-white px-3 py-2.5 text-sm ring-1 ring-zinc-200/80">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="font-medium text-zinc-900">{selected.label}</p>
          <p className="tabular-nums font-semibold text-zinc-900">
            {selected.totalJobs.toLocaleString()}{" "}
            <span className="text-xs font-normal text-zinc-500">{unitLabel}</span>
          </p>
        </div>
        <p className="mt-0.5 text-xs text-zinc-500">{detailFor(selected)}</p>
      </div>
    </div>
  );
}
