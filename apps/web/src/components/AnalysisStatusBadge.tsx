import type { AnalysisStatus } from "@jobs-reporter/shared";

const STATUS_STYLES: Record<AnalysisStatus, string> = {
  pending: "bg-amber-50 text-amber-700",
  running: "bg-blue-50 text-blue-700",
  completed: "bg-emerald-50 text-emerald-700",
  failed: "bg-red-50 text-red-700",
};

const STATUS_LABELS: Record<AnalysisStatus, string> = {
  pending: "Изчаква",
  running: "Анализира се",
  completed: "Завършен",
  failed: "Грешка",
};

export function AnalysisStatusBadge({ status }: { status: AnalysisStatus }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[status]}`}
    >
      {(status === "pending" || status === "running") && (
        <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-current" />
      )}
      {STATUS_LABELS[status]}
    </span>
  );
}
