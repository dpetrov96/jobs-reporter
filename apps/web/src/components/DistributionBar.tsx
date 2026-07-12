interface DistributionBarProps {
  label: string;
  count: number;
  max: number;
  suffix?: string;
  rank?: number;
}

export function DistributionBar({ label, count, max, suffix, rank }: DistributionBarProps) {
  const width = max > 0 ? Math.max((count / max) * 100, count > 0 ? 4 : 0) : 0;
  const share = max > 0 ? Math.round((count / max) * 100) : 0;

  return (
    <div
      className="group/bar flex items-center gap-2.5 text-xs"
      title={`${label}: ${count} positions opened (${share}% of busiest day)`}
    >
      {rank != null ? (
        <span className="w-5 shrink-0 text-right text-[10px] tabular-nums text-zinc-400">
          {rank}
        </span>
      ) : null}
      <span
        className="w-24 shrink-0 truncate text-right text-zinc-600 sm:w-28"
        title={label}
      >
        {label}
      </span>
      <div className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-zinc-100">
        <div
          className="h-full rounded-full bg-gradient-to-r from-[#0a66c2] to-[#378fe9] transition-all"
          style={{ width: `${width}%` }}
        />
      </div>
      <span className="w-9 shrink-0 text-right tabular-nums font-medium text-zinc-700">
        {count}
        {suffix ?? ""}
      </span>
    </div>
  );
}

interface RankedListProps {
  items: Array<{ label: string; count: number }>;
  emptyLabel?: string;
  showRank?: boolean;
}

export function RankedList({ items, emptyLabel = "No data", showRank = true }: RankedListProps) {
  if (items.length === 0) {
    return <p className="text-sm text-zinc-400">{emptyLabel}</p>;
  }

  const max = items[0]?.count ?? 1;

  return (
    <div className="space-y-2">
      {items.map((item, index) => (
        <DistributionBar
          key={item.label}
          label={item.label}
          count={item.count}
          max={max}
          rank={showRank ? index + 1 : undefined}
        />
      ))}
    </div>
  );
}
