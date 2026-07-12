import { Link } from "react-router-dom";
import {
  encodeAnalysisId,
  formatAnalysisPeriod,
  formatMarketMonitoringScope,
  getAnalysisCountryCount,
  isAnalysisInProgress,
} from "@jobs-reporter/shared";
import type { AnalysisRecord } from "@jobs-reporter/shared";
import { AnalysisStatusBadge } from "./AnalysisStatusBadge";

export function AnalysisHistoryRow({ analysis }: { analysis: AnalysisRecord }) {
  const inProgress = isAnalysisInProgress(analysis.status);

  return (
    <Link
      to={`/analyses/${encodeAnalysisId(analysis.fetchedAt)}`}
      className="group block border-b border-zinc-200 py-4 transition hover:bg-zinc-50/80 sm:-mx-2 sm:rounded-lg sm:border-b-0 sm:border-transparent sm:px-2"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="font-medium text-zinc-900 group-hover:text-[#0a66c2]">
            {formatAnalysisPeriod(analysis.periodStart, analysis.periodEnd)}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
            <AnalysisStatusBadge status={analysis.status} />
            {analysis.status === "completed" ? (
              <span>
                {formatMarketMonitoringScope(analysis.periodStart, analysis.periodEnd)}
                {" · "}
                {analysis.uniqueJobs.toLocaleString()} jobs · {getAnalysisCountryCount(analysis)}{" "}
                countries
              </span>
            ) : inProgress ? (
              <span>Analysis running in the background</span>
            ) : analysis.error ? (
              <span className="text-red-600">{analysis.error}</span>
            ) : null}
          </div>
        </div>
      </div>
    </Link>
  );
}
