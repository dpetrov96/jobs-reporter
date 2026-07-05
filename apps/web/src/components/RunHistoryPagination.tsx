export function RunHistoryPagination({
  page,
  hasNext,
  onPrevious,
  onNext,
}: {
  page: number;
  hasNext: boolean;
  onPrevious: () => void;
  onNext: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-t border-zinc-100 pt-4 text-xs text-zinc-500">
      <button
        type="button"
        disabled={page === 0}
        onClick={onPrevious}
        className="disabled:opacity-30"
      >
        ← Previous
      </button>
      <span>Page {page + 1}</span>
      <button type="button" disabled={!hasNext} onClick={onNext} className="disabled:opacity-30">
        Next →
      </button>
    </div>
  );
}
