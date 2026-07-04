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
    <div className="pagination">
      <button type="button" className="ghost-btn" disabled={page === 0} onClick={onPrevious}>
        ← Previous
      </button>
      <span className="pagination-label">Page {page + 1}</span>
      <button type="button" className="ghost-btn" disabled={!hasNext} onClick={onNext}>
        Next →
      </button>
    </div>
  );
}
