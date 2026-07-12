import { Link } from "react-router-dom";
import type { AnalysisRecord } from "@jobs-reporter/shared";
import {
  encodeAnalysisId,
  formatAnalysisPeriod,
  formatAnalysisPeriodTimeRange,
  getAnalysisCountryCount,
  periodDayCount,
} from "@jobs-reporter/shared";
import { getAnalysisCompanyCount } from "../lib/analysisCompanies";

function StatPill({
  label,
  value,
  href,
}: {
  label: string;
  value: string;
  href?: string;
}) {
  const inner = (
    <>
      <div className="text-lg font-semibold tabular-nums leading-none text-white sm:text-xl">
        {value}
      </div>
      <div className="mt-1 flex items-center gap-1 text-[10px] font-medium uppercase tracking-wide text-white/60">
        {label}
        {href ? <span aria-hidden className="text-white/40">→</span> : null}
      </div>
    </>
  );

  if (href) {
    return (
      <Link
        to={href}
        className="rounded-lg bg-white/10 px-3 py-2 backdrop-blur-sm ring-1 ring-white/10 transition hover:bg-white/20 hover:ring-white/30"
      >
        {inner}
      </Link>
    );
  }

  return (
    <div className="rounded-lg bg-white/10 px-3 py-2 backdrop-blur-sm ring-1 ring-white/10">
      {inner}
    </div>
  );
}

export function AnalysisHero({ analysis }: { analysis: AnalysisRecord }) {
  const days = periodDayCount(analysis.periodStart, analysis.periodEnd);
  const countryCount = getAnalysisCountryCount(analysis);
  const companyCount = getAnalysisCompanyCount(analysis);
  const companiesHref = `/analyses/${encodeAnalysisId(analysis.fetchedAt)}/companies`;

  return (
    <section
      id="overview"
      className="scroll-mt-28 overflow-hidden rounded-2xl border border-zinc-200/90 border-t-[3px] border-t-[#0a66c2] bg-gradient-to-br from-zinc-900 via-zinc-800 to-[#0a66c2] text-white shadow-xl"
    >
      <div className="p-5 sm:p-6">
        <div className="flex items-start gap-4">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/15 text-xs font-bold ring-1 ring-white/20">
            01
          </span>
          <div>
            <span className="inline-flex rounded-full bg-white/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-white/70 ring-1 ring-white/15">
              Market analysis
            </span>
            <h2 className="mt-2 text-lg font-semibold leading-snug sm:text-xl">
              {formatAnalysisPeriod(
                analysis.periodStart,
                analysis.periodEnd,
                analysis.runCount || undefined
              )}
            </h2>
            <p className="mt-1.5 text-sm text-white/60">
              {formatAnalysisPeriodTimeRange(analysis.periodStart, analysis.periodEnd)} (Sofia) ·{" "}
              {days} {days === 1 ? "day" : "days"} · {countryCount} EU markets
            </p>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatPill label="Listings" value={analysis.uniqueJobs.toLocaleString()} />
        <StatPill
          label="Companies"
          value={companyCount.toLocaleString()}
          href={companiesHref}
        />
        <StatPill label="Countries" value={String(countryCount)} />
        <StatPill label="Scrapes" value={analysis.runCount.toLocaleString()} />
        </div>
      </div>
    </section>
  );
}
