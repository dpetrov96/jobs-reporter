import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { encodeAnalysisId, normalizePeriodInput, startAnalysis } from "@jobs-reporter/shared";
import type { AnalysisRecord } from "@jobs-reporter/shared";

function defaultStartDate(): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - 7);
  return date.toISOString().slice(0, 10);
}

function defaultEndDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export function StartAnalysisForm({
  apiUrl,
  existingPeriods,
  onStarted,
}: {
  apiUrl: string;
  existingPeriods: AnalysisRecord[];
  onStarted: (analysis: AnalysisRecord) => void;
}) {
  const [periodStart, setPeriodStart] = useState(defaultStartDate);
  const [periodEnd, setPeriodEnd] = useState(defaultEndDate);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const periodTaken = existingPeriods.some((analysis) => {
    try {
      const start = normalizePeriodInput(periodStart, false);
      const end = normalizePeriodInput(periodEnd, true);
      return analysis.periodStart === start && analysis.periodEnd === end;
    } catch {
      return false;
    }
  });

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const response = await startAnalysis(apiUrl, { periodStart, periodEnd });

      if (response.analysis) {
        onStarted(response.analysis);
        navigate(`/analyses/${encodeAnalysisId(response.analysis.fetchedAt)}`);
      }
    } catch (err) {
      const conflict =
        err instanceof Error &&
        "status" in err &&
        (err as Error & { status?: number }).status === 409 &&
        "analysis" in err;

      if (conflict) {
        const existing = (err as Error & { analysis?: AnalysisRecord }).analysis;
        if (existing) {
          navigate(`/analyses/${encodeAnalysisId(existing.fetchedAt)}`);
          return;
        }
      }

      setError(err instanceof Error ? err.message : "Неуспешно стартиране");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={(event) => void handleSubmit(event)}
      className="rounded-xl border border-zinc-200 bg-zinc-50/50 p-4 sm:p-5"
    >
      <h2 className="text-sm font-semibold text-zinc-900">Нов анализ</h2>
      <p className="mt-1 text-xs text-zinc-500">
        Избери период. Всеки период може да се анализира само веднъж.
      </p>

      <div className="mt-4 flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-xs text-zinc-600">
          От
          <input
            type="date"
            value={periodStart}
            onChange={(event) => setPeriodStart(event.target.value)}
            className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900"
            required
          />
        </label>

        <label className="flex flex-col gap-1 text-xs text-zinc-600">
          До
          <input
            type="date"
            value={periodEnd}
            onChange={(event) => setPeriodEnd(event.target.value)}
            className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900"
            required
          />
        </label>

        <button
          type="submit"
          disabled={submitting || periodTaken}
          className="rounded-lg bg-[#0a66c2] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#004182] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? "Стартира…" : "Стартирай анализ"}
        </button>
      </div>

      {periodTaken ? (
        <p className="mt-3 text-xs text-amber-700">
          Този период вече е анализиран. Отвори съществуващия анализ от списъка.
        </p>
      ) : null}

      {error ? <p className="mt-3 text-xs text-red-600">{error}</p> : null}
    </form>
  );
}
