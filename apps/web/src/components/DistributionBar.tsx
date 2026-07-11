interface DistributionBarProps {
  label: string;
  count: number;
  max: number;
  suffix?: string;
}

export function DistributionBar({ label, count, max, suffix }: DistributionBarProps) {
  const width = max > 0 ? Math.max((count / max) * 100, count > 0 ? 4 : 0) : 0;

  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-28 shrink-0 truncate text-right text-zinc-500" title={label}>
        {label}
      </span>
      <div className="h-2 min-w-0 flex-1 rounded-full bg-zinc-100">
        <div
          className="h-full rounded-full bg-[#0a66c2] transition-all"
          style={{ width: `${width}%` }}
        />
      </div>
      <span className="w-8 shrink-0 tabular-nums text-zinc-600">
        {count}
        {suffix ?? ""}
      </span>
    </div>
  );
}

interface RankedListProps {
  items: Array<{ label: string; count: number }>;
  emptyLabel?: string;
}

export function RankedList({ items, emptyLabel = "Няма данни" }: RankedListProps) {
  if (items.length === 0) {
    return <p className="text-sm text-zinc-400">{emptyLabel}</p>;
  }

  const max = items[0]?.count ?? 1;

  return (
    <div className="space-y-1.5">
      {items.map((item) => (
        <DistributionBar key={item.label} label={item.label} count={item.count} max={max} />
      ))}
    </div>
  );
}
