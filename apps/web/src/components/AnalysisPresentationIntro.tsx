import { Link } from "react-router-dom";
import type { AnalysisRecord, CountryAnalysisResult } from "@jobs-reporter/shared";
import {
  ANALYSIS_PRODUCT_TITLE,
  encodeAnalysisId,
  formatMarketMonitoringScope,
  getAnalysisCountryCount,
  sortByCountryDisplayOrder,
} from "@jobs-reporter/shared";
import { getAnalysisCompanyCount } from "../lib/analysisCompanies";
import { CountryFlag } from "./CountryFlag";

function scrollToSection(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function StatColumn({
  value,
  label,
  href,
}: {
  value: string;
  label: string;
  href?: string;
}) {
  const inner = (
    <>
      <div className="text-3xl font-bold tabular-nums tracking-tight sm:text-4xl">{value}</div>
      <div className="mt-1.5 text-[11px] font-medium uppercase tracking-wider text-white/50">
        {label}
        {href ? <span className="ml-1 text-white/30">→</span> : null}
      </div>
    </>
  );

  if (href) {
    return (
      <Link to={href} className="block transition hover:text-white/90">
        {inner}
      </Link>
    );
  }

  return inner;
}

function CountryChip({ country }: { country: CountryAnalysisResult }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-xs font-medium text-white/85">
      <CountryFlag
        code={country.code}
        location={country.location}
        flag={country.flag}
        size="sm"
      />
      {country.location}
    </span>
  );
}

function InclusionItem({ label, detail }: { label: string; detail: string }) {
  return (
    <li className="flex gap-3">
      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-white/50" aria-hidden />
      <span>
        <span className="font-medium text-white/90">{label}</span>
        <span className="text-white/55"> — {detail}</span>
      </span>
    </li>
  );
}

export function AnalysisPresentationIntro({
  analysis,
  countries: countriesProp,
  hasAi,
}: {
  analysis: AnalysisRecord;
  countries?: CountryAnalysisResult[];
  hasAi: boolean;
}) {
  const countries = sortByCountryDisplayOrder(countriesProp ?? analysis.countries ?? []);
  const countryCount = countries.length || getAnalysisCountryCount(analysis);
  const companyCount = getAnalysisCompanyCount(analysis);
  const companiesHref = `/analyses/${encodeAnalysisId(analysis.fetchedAt)}/companies`;
  const monitoringScope = formatMarketMonitoringScope(analysis.periodStart, analysis.periodEnd);

  const agenda = [
    {
      id: "overview",
      step: "01",
      title: "Scope & volume",
      detail: "Markets covered, listings & employers",
    },
    ...(hasAi
      ? [
          {
            id: "ai-guide",
            step: "02",
            title: "AI career guide",
            detail: "In-demand tech, portfolio projects & interview prep",
          },
        ]
      : []),
    {
      id: "countries",
      step: hasAi ? "03" : "02",
      title: "Country breakdowns",
      detail: "Top roles, technologies & when jobs open",
    },
  ];

  const inclusions = [
    {
      label: "Country breakdowns",
      detail: `top employers, most searched roles and technologies mentioned in job descriptions across ${countryCount} EU markets`,
    },
    {
      label: "Posting patterns",
      detail: "when companies tend to publish new listings — by hour of day and day of week",
    },
    {
      label: "Company directory",
      detail: `${companyCount.toLocaleString()} hiring employers ranked by listing volume, with market per company`,
    },
    ...(hasAi
      ? [
          {
            label: "AI career guide",
            detail:
              "how to prepare for the market — in-demand tech stacks, example portfolio projects and interview topics extracted from real job descriptions",
          },
        ]
      : []),
  ];

  return (
    <section id="overview" className="scroll-mt-32 sm:scroll-mt-28">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-zinc-950 via-zinc-900 to-[#0a66c2] px-5 py-8 text-white sm:rounded-[2rem] sm:px-12 sm:py-14 lg:px-16 lg:py-16">
        <div
          className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-white/5 blur-3xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-20 left-1/4 h-56 w-56 rounded-full bg-[#0a66c2]/25 blur-3xl"
          aria-hidden
        />

        <div className="relative mx-auto max-w-5xl">
          <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-white/40">
            {ANALYSIS_PRODUCT_TITLE}
          </p>

          <h1 className="mt-3 max-w-4xl text-2xl font-bold leading-[1.15] tracking-tight sm:mt-4 sm:text-4xl lg:text-[2.75rem]">
            Tech hiring across {countryCount} European{" "}
            {countryCount === 1 ? "market" : "markets"}
          </h1>

          <p className="mt-6 max-w-3xl text-base leading-relaxed text-white/70 sm:text-lg">
            A tech job market report built from{" "}
            <span className="font-medium text-white/90">
              {analysis.uniqueJobs.toLocaleString()} real LinkedIn postings
            </span>
            . {monitoringScope.charAt(0).toUpperCase()}
            {monitoringScope.slice(1)}.
          </p>

          {countries.length > 0 ? (
            <div className="mt-5 flex flex-wrap gap-2">
              {countries.map((country) => (
                <CountryChip key={country.code} country={country} />
              ))}
            </div>
          ) : null}

          <div className="mt-6 max-w-3xl">
            <p className="text-sm font-medium text-white/80">What this analysis includes</p>
            <ul className="mt-3 space-y-2.5 text-sm leading-relaxed text-white/60 sm:text-[15px]">
              {inclusions.map((item) => (
                <InclusionItem key={item.label} label={item.label} detail={item.detail} />
              ))}
            </ul>
          </div>

          <div className="mt-10 grid grid-cols-1 gap-px overflow-hidden rounded-2xl bg-white/10 sm:grid-cols-3">
            <div className="bg-white/5 px-5 py-6 sm:px-6">
              <StatColumn value={analysis.uniqueJobs.toLocaleString()} label="Job listings" />
            </div>
            <div className="bg-white/5 px-5 py-6 sm:px-6">
              <StatColumn
                value={companyCount.toLocaleString()}
                label="Companies hiring"
                href={companiesHref}
              />
            </div>
            <div className="bg-white/5 px-5 py-6 sm:px-6">
              <StatColumn value={String(countryCount)} label="Countries" />
            </div>
          </div>

          <div className="mt-12 border-t border-white/10 pt-8">
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/35">
              What&apos;s in this report
            </p>
            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {agenda.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => scrollToSection(item.id)}
                  className="group flex items-start gap-3 rounded-2xl border border-white/0 px-2 py-2 text-left transition hover:border-white/10 hover:bg-white/5"
                >
                  <span className="text-2xl font-bold tabular-nums text-white/20 transition group-hover:text-white/45">
                    {item.step}
                  </span>
                  <span>
                    <span className="block text-sm font-semibold text-white/90 transition group-hover:text-white">
                      {item.title}
                    </span>
                    <span className="mt-1 block text-xs leading-snug text-white/45">
                      {item.detail}
                    </span>
                  </span>
                </button>
              ))}
              <Link
                to={companiesHref}
                className="group flex items-start gap-3 rounded-2xl border border-white/0 px-2 py-2 transition hover:border-white/10 hover:bg-white/5"
              >
                <span className="text-2xl font-bold text-white/20 transition group-hover:text-white/45">
                  →
                </span>
                <span>
                  <span className="block text-sm font-semibold text-white/90 transition group-hover:text-white">
                    All companies
                  </span>
                  <span className="mt-1 block text-xs text-white/45">
                    {companyCount.toLocaleString()} employers · full directory
                  </span>
                </span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export { scrollToSection };
