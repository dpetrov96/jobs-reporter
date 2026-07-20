import type { RunReportKindFilter } from "@jobs-reporter/shared";

const FILTERS: { id: RunReportKindFilter; label: string }[] = [
  { id: "all", label: "All runs" },
  { id: "daily", label: "Daily summaries" },
  { id: "hourly", label: "Hourly scrapes" },
];

export function RunKindFilter({
  value,
  onChange,
}: {
  value: RunReportKindFilter;
  onChange: (value: RunReportKindFilter) => void;
}) {
  return (
    <div
      className="flex flex-wrap gap-1.5 rounded-xl bg-zinc-100/80 p-1 ring-1 ring-zinc-200/70"
      role="tablist"
      aria-label="Filter by report type"
    >
      {FILTERS.map((filter) => {
        const active = value === filter.id;
        return (
          <button
            key={filter.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(filter.id)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
              active
                ? filter.id === "daily"
                  ? "bg-sky-600 text-white shadow-sm"
                  : "bg-white text-zinc-900 shadow-sm ring-1 ring-zinc-200/80"
                : "text-zinc-600 hover:bg-white/70 hover:text-zinc-900"
            }`}
          >
            {filter.label}
          </button>
        );
      })}
    </div>
  );
}
