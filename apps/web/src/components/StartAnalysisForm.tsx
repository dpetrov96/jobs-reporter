import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  buildIncrementalAnalysisOption,
  encodeAnalysisId,
  periodOptionTaken,
  startAnalysis,
} from "@jobs-reporter/shared";
import type { AnalysisRecord, JobRunRecord } from "@jobs-reporter/shared";

export function StartAnalysisForm({
  apiUrl,
  runs,
  runsLoading,
  runsError,
  existingPeriods,
  onStarted,
}: {
  apiUrl: string;
  runs: JobRunRecord[];
  runsLoading: boolean;
  runsError: string | null;
  existingPeriods: AnalysisRecord[];
  onStarted: (analysis: AnalysisRecord) => void;
}) {
  const option = useMemo(
    () => buildIncrementalAnalysisOption(runs, existingPeriods),
    [runs, existingPeriods]
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const periodTaken = option ? periodOptionTaken(option, existingPeriods) : false;
  const inProgress = existingPeriods.some(
    (a) => a.status === "pending" || a.status === "running"
  );

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!option) return;

    setSubmitting(true);
    setError(null);

    try {
      const response = await startAnalysis(apiUrl, {
        periodStart: option.periodStart,
        periodEnd: option.periodEnd,
        periodLabel: option.label,
      });

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

      setError(err instanceof Error ? err.message : "Failed to start");
    } finally {
      setSubmitting(false);
    }
  }

  if (runsLoading) {
    return (
      <div className="rounded-xl border border-zinc-200 bg-zinc-50/50 p-4 sm:p-5">
        <div className="flex items-center gap-3 text-sm text-zinc-400">
          <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-zinc-300 border-t-transparent" />
          Loading available scrapes…
        </div>
      </div>
    );
  }

  if (runsError) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        {runsError}
      </div>
    );
  }

  if (runs.length === 0) {
    return (
      <div className="rounded-xl border border-zinc-200 bg-zinc-50/50 p-4 sm:p-5">
        <h2 className="text-sm font-semibold text-zinc-900">New analysis</h2>
        <p className="mt-2 text-sm text-zinc-500">
          No scrapes yet. Wait for the first automatic or manual scan from Latest report.
        </p>
      </div>
    );
  }

  if (!option) {
    const latestCompleted = [...existingPeriods]
      .filter((analysis) => analysis.status === "completed")
      .sort((a, b) => Date.parse(b.completedAt ?? b.createdAt) - Date.parse(a.completedAt ?? a.createdAt))[0];

    return (
      <div className="rounded-xl border border-zinc-200 bg-zinc-50/50 p-4 sm:p-5">
        <h2 className="text-sm font-semibold text-zinc-900">New analysis</h2>
        <p className="mt-2 text-sm text-zinc-500">
          All scrapes are already analyzed. The next automatic scan can be analyzed again.
        </p>
        {latestCompleted ? (
          <p className="mt-2 text-xs text-zinc-500">
            To re-run the same period (e.g. with AI), open the latest analysis and click
            &quot;Run again&quot;.
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <form
      onSubmit={(event) => void handleSubmit(event)}
      className="rounded-xl border border-zinc-200 bg-zinc-50/50 p-4 sm:p-5"
    >
      <h2 className="text-sm font-semibold text-zinc-900">New analysis</h2>
      <p className="mt-1 text-xs text-zinc-500">
        Analyze new scrapes from the last unanalyzed run through the latest.
      </p>

      <div className="mt-4 space-y-3">
        <div className="rounded-lg border border-zinc-200 bg-white px-4 py-3">
          <p className="text-sm font-medium text-zinc-900">{option.label}</p>
          <p className="mt-1 text-xs text-zinc-500">{option.detail}</p>
        </div>

        <button
          type="submit"
          disabled={submitting || periodTaken || inProgress}
          className="rounded-lg bg-[#0a66c2] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#004182] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? "Starting…" : "Start analysis"}
        </button>
      </div>

      {inProgress ? (
        <p className="mt-3 text-xs text-amber-700">Another analysis is currently running.</p>
      ) : null}

      {periodTaken ? (
        <p className="mt-3 text-xs text-amber-700">
          This period is already analyzed. Open the existing analysis from the list.
        </p>
      ) : null}

      {error ? <p className="mt-3 text-xs text-red-600">{error}</p> : null}
    </form>
  );
}
