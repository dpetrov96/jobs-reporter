import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  encodeAnalysisId,
  enrichCompanyDomains,
  cancelDomainEnrichment,
  fetchAnalysis,
  formatAnalysisPeriod,
  formatMarketMonitoringScope,
  getAnalysisCountryCount,
  buildAnalysisShareMeta,
  isDomainEnrichmentInProgress,
  sortByCountryDisplayOrder,
} from "@jobs-reporter/shared";
import type { AnalysisRecord } from "@jobs-reporter/shared";
import { CompaniesTable } from "../components/CompaniesTable";
import { CompanyCountryFilter } from "../components/CompanyCountryFilter";
import { DomainEnrichmentPanel } from "../components/DomainEnrichmentPanel";
import {
  buildCountryLabelMap,
  buildMissingDomainsByCountry,
  countMissingDomains,
  filterCompaniesByCountry,
  getAnalysisCompanies,
  getAnalysisCompanyCount,
  getCompanyCountryOptions,
} from "../lib/analysisCompanies";
import { usePageMeta } from "../hooks/usePageMeta";
import {
  buildCompaniesExportFilename,
  downloadCompaniesCsv,
} from "../lib/exportCompaniesCsv";

function LoadingState() {
  return (
    <div className="flex items-center gap-2 px-4 py-16 text-sm text-zinc-400 sm:px-6">
      <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-zinc-300 border-t-transparent" />
      Loading companies…
    </div>
  );
}

export function AnalysisCompaniesPage({ apiUrl }: { apiUrl: string }) {
  const { analysisId: encodedId, countryCode: routeCountryCode } = useParams<{
    analysisId: string;
    countryCode?: string;
  }>();
  const analysisId = encodedId ? decodeURIComponent(encodedId) : "";
  const countryCode = routeCountryCode?.toUpperCase();

  const [analysis, setAnalysis] = useState<AnalysisRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [enrichError, setEnrichError] = useState<string | null>(null);
  const [enrichStarting, setEnrichStarting] = useState(false);
  const [enrichStopping, setEnrichStopping] = useState(false);

  const POLL_INTERVAL_MS = 1500;

  const loadAnalysis = useCallback(async () => {
    if (!analysisId) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetchAnalysis(apiUrl, analysisId);
      if (response.analysis) {
        setAnalysis(response.analysis);
      } else {
        setError("Analysis not found");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [apiUrl, analysisId]);

  useEffect(() => {
    void loadAnalysis();
  }, [loadAnalysis]);

  const allCompanies = analysis ? getAnalysisCompanies(analysis) : [];
  const companyCount = analysis ? getAnalysisCompanyCount(analysis) : 0;
  const countryLabels = useMemo(
    () => (analysis ? buildCountryLabelMap(analysis) : new Map()),
    [analysis]
  );
  const countryOptions = useMemo(
    () => (analysis ? getCompanyCountryOptions(analysis) : []),
    [analysis]
  );
  const sortedCountryOptions = useMemo(
    () => sortByCountryDisplayOrder(countryOptions),
    [countryOptions]
  );

  const validCountryCode = useMemo(() => {
    if (!countryCode) return undefined;
    return sortedCountryOptions.some((c) => c.code === countryCode) ? countryCode : undefined;
  }, [countryCode, sortedCountryOptions]);

  const companies = useMemo(
    () => filterCompaniesByCountry(allCompanies, validCountryCode),
    [allCompanies, validCountryCode]
  );

  const missingDomainsByCountry = useMemo(
    () =>
      buildMissingDomainsByCountry(
        allCompanies,
        sortedCountryOptions.map((country) => country.code)
      ),
    [allCompanies, sortedCountryOptions]
  );

  const missingDomainsCount = useMemo(() => countMissingDomains(companies), [companies]);
  const domainsFoundCount = companies.length - missingDomainsCount;

  const activeCountry = validCountryCode
    ? sortedCountryOptions.find((c) => c.code === validCountryCode)
    : undefined;

  const domainEnrichmentRunning = isDomainEnrichmentInProgress(analysis?.domainEnrichmentStatus);
  const enrichmentForCurrentMarket =
    domainEnrichmentRunning &&
    validCountryCode != null &&
    analysis?.domainEnrichmentCountryCode === validCountryCode;

  const handleStopEnrichment = async () => {
    if (!analysisId || enrichStopping) return;

    setEnrichStopping(true);
    setEnrichError(null);

    try {
      const response = await cancelDomainEnrichment(apiUrl, analysisId);
      if (response.analysis) {
        setAnalysis(response.analysis);
      }
    } catch (err) {
      setEnrichError(err instanceof Error ? err.message : "Failed to stop domain lookup");
    } finally {
      setEnrichStopping(false);
    }
  };
  const enrichmentForOtherMarket =
    domainEnrichmentRunning &&
    analysis?.domainEnrichmentCountryCode != null &&
    analysis.domainEnrichmentCountryCode !== validCountryCode;

  useEffect(() => {
    if (!domainEnrichmentRunning || !analysisId) return;

    let cancelled = false;

    async function poll() {
      while (!cancelled) {
        await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
        if (cancelled) break;

        try {
          const response = await fetchAnalysis(apiUrl, analysisId);
          if (response.analysis && !cancelled) {
            setAnalysis(response.analysis);
            if (!isDomainEnrichmentInProgress(response.analysis.domainEnrichmentStatus)) {
              break;
            }
          }
        } catch {
          // Keep polling on transient errors
        }
      }
    }

    void poll();

    return () => {
      cancelled = true;
    };
  }, [apiUrl, analysisId, domainEnrichmentRunning]);

  const handleEnrichDomains = async () => {
    if (!analysisId || !validCountryCode || domainEnrichmentRunning || enrichStarting) return;

    setEnrichStarting(true);
    setEnrichError(null);

    try {
      const response = await enrichCompanyDomains(apiUrl, analysisId, {
        countryCode: validCountryCode,
      });
      if (response.analysis) {
        setAnalysis(response.analysis);
      }
    } catch (err) {
      setEnrichError(err instanceof Error ? err.message : "Failed to start domain lookup");
    } finally {
      setEnrichStarting(false);
    }
  };

  const companiesWithDomain = useMemo(
    () => companies.filter((company) => company.domain?.trim()),
    [companies]
  );

  const handleExportCsv = (withDomainOnly: boolean) => {
    if (!analysis) return;

    const rows = withDomainOnly ? companiesWithDomain : companies;
    if (rows.length === 0) return;

    downloadCompaniesCsv(
      rows,
      buildCompaniesExportFilename({
        countryCode: validCountryCode,
        periodStart: analysis.periodStart,
        periodEnd: analysis.periodEnd,
        withDomainOnly,
      })
    );
  };

  const invalidCountry = Boolean(countryCode && analysis && !validCountryCode);
  const needsReanalyze = analysis && !analysis.globalCompanies?.length && companyCount <= 50;
  const missingCountries = companies.length > 0 && !companies[0]?.countries?.length;

  const pageMeta = useMemo(() => {
    if (!analysis) return null;

    const meta = buildAnalysisShareMeta(
      {
        periodStart: analysis.periodStart,
        periodEnd: analysis.periodEnd,
        countries: analysis.countries,
        countryCount: getAnalysisCountryCount(analysis),
        totalJobs: analysis.totalJobs,
        uniqueCompanies: analysis.uniqueCompanies,
      },
      {
        suffix: activeCountry ? `Companies · ${activeCountry.location}` : "Companies",
      }
    );

    return {
      ...meta,
      ogUrl: typeof window !== "undefined" ? window.location.href : undefined,
    };
  }, [analysis, activeCountry]);

  usePageMeta(pageMeta);

  const showEnrichmentPanel =
    validCountryCode != null &&
    analysis?.domainEnrichmentCountryCode === validCountryCode &&
    (enrichmentForCurrentMarket ||
      (analysis.domainEnrichmentResults?.length ?? 0) > 0 ||
      analysis.domainEnrichmentStatus === "cancelled");

  const analysisHref = `/analyses/${encodeAnalysisId(analysisId)}`;

  return (
    <main className="w-full">
      {error ? (
        <div className="px-4 py-4 text-sm text-red-600 sm:px-6">{error}</div>
      ) : null}

      {loading ? (
        <LoadingState />
      ) : analysis ? (
        <>
          <header className="border-b border-zinc-200 px-4 py-4 sm:px-6">
            <Link
              to={analysisHref}
              className="cursor-pointer text-xs font-medium text-zinc-400 transition hover:text-zinc-700"
            >
              ← Back to analysis
            </Link>

            <h1 className="mt-3 text-xl font-semibold tracking-tight text-zinc-900 sm:text-2xl">
              {activeCountry ? `Companies in ${activeCountry.location}` : "All hiring companies"}
            </h1>
            <p className="mt-1 text-sm text-zinc-500">
              {formatAnalysisPeriod(analysis.periodStart, analysis.periodEnd)} ·{" "}
              {formatMarketMonitoringScope(analysis.periodStart, analysis.periodEnd).toLowerCase()}
            </p>

            {needsReanalyze ? (
              <p className="mt-3 text-xs text-amber-700">
                Partial data — run analysis again for the full list.
              </p>
            ) : null}

            {missingCountries && !needsReanalyze ? (
              <p className="mt-3 text-xs text-blue-700">
                Country breakdown missing — click <strong>Run again</strong> on the analysis to
                refresh.
              </p>
            ) : null}

            {invalidCountry ? (
              <p className="mt-3 text-xs text-amber-700">
                Unknown market filter — showing all companies instead.
              </p>
            ) : null}
          </header>

          <CompanyCountryFilter
            analysisId={analysisId}
            countries={sortedCountryOptions}
            activeCountryCode={invalidCountry ? undefined : countryCode}
            totalCount={allCompanies.length}
            filteredCount={companies.length}
            missingDomainsByCountry={missingDomainsByCountry}
          />

          {validCountryCode && activeCountry ? (
            <div className="border-b border-zinc-100 px-4 py-3 sm:px-6">
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => void handleEnrichDomains()}
                  disabled={
                    !validCountryCode ||
                    domainEnrichmentRunning ||
                    enrichStarting ||
                    companies.length === 0 ||
                    analysis.status !== "completed"
                  }
                  className="cursor-pointer rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {enrichmentForCurrentMarket || enrichStarting ? (
                    <span className="inline-flex items-center gap-2">
                      <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      Finding domains…
                    </span>
                  ) : missingDomainsCount === 0 ? (
                    `Re-run for ${activeCountry.location}`
                  ) : (
                    `Find domains in ${activeCountry.location} · ${missingDomainsCount} missing`
                  )}
                </button>

                {domainsFoundCount > 0 ? (
                  <span className="text-xs text-zinc-500">
                    {domainsFoundCount.toLocaleString()} with website in this market
                  </span>
                ) : null}
              </div>

              {showEnrichmentPanel ? (
                <DomainEnrichmentPanel
                  marketLabel={activeCountry.location}
                  processed={analysis.domainEnrichmentProcessed}
                  total={analysis.domainEnrichmentTotal}
                  progress={analysis.domainEnrichmentProgress}
                  results={analysis.domainEnrichmentResults}
                  running={enrichmentForCurrentMarket}
                  stopping={enrichStopping}
                  onStop={() => void handleStopEnrichment()}
                />
              ) : null}

              {enrichmentForOtherMarket ? (
                <p className="mt-2 text-xs text-zinc-500">
                  Domain lookup running for{" "}
                  {sortedCountryOptions.find(
                    (country) => country.code === analysis.domainEnrichmentCountryCode
                  )?.location ?? analysis.domainEnrichmentCountryCode}
                  …
                </p>
              ) : null}

              {!domainEnrichmentRunning &&
              analysis.domainEnrichmentStatus === "completed" &&
              analysis.domainEnrichmentCountryCode === validCountryCode &&
              analysis.domainEnrichmentProgress &&
              !showEnrichmentPanel ? (
                <p className="mt-2 text-xs text-emerald-700">{analysis.domainEnrichmentProgress}</p>
              ) : null}

              {analysis.domainEnrichmentStatus === "cancelled" &&
              analysis.domainEnrichmentCountryCode === validCountryCode &&
              analysis.domainEnrichmentProgress ? (
                <p className="mt-2 text-xs text-amber-700">{analysis.domainEnrichmentProgress}</p>
              ) : null}

              {analysis.domainEnrichmentStatus === "failed" &&
              analysis.domainEnrichmentCountryCode === validCountryCode &&
              analysis.domainEnrichmentError ? (
                <p className="mt-2 text-xs text-red-600">{analysis.domainEnrichmentError}</p>
              ) : null}

              {enrichError ? <p className="mt-2 text-xs text-red-600">{enrichError}</p> : null}
            </div>
          ) : (
            <p className="border-b border-zinc-100 px-4 py-3 text-xs text-zinc-500 sm:px-6">
              Select a market tab to find company website domains with AI.
            </p>
          )}

          {companies.length > 0 ? (
            <div className="flex flex-wrap items-center gap-2 border-b border-zinc-100 px-4 py-3 sm:px-6">
              <span className="text-xs font-medium text-zinc-600">Export CSV</span>
              <button
                type="button"
                onClick={() => handleExportCsv(false)}
                className="cursor-pointer rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 transition hover:bg-zinc-50"
              >
                All companies ({companies.length.toLocaleString()})
              </button>
              <button
                type="button"
                onClick={() => handleExportCsv(true)}
                disabled={companiesWithDomain.length === 0}
                className="cursor-pointer rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                With domain ({companiesWithDomain.length.toLocaleString()})
              </button>
              <span className="text-[11px] text-zinc-400">Columns: Name, Domain</span>
            </div>
          ) : null}

          <CompaniesTable companies={companies} countryLabels={countryLabels} />
        </>
      ) : null}
    </main>
  );
}
