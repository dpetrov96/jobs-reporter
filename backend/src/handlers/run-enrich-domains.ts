import type { Handler } from "aws-lambda";
import {
  DOMAIN_LOOKUP_BATCH_SIZE,
  resolveCompanyDomainsBatch,
} from "../services/analyses/company-domains.js";
import {
  filterCompaniesByCountry,
  loadAnalysisCompanies,
  patchAnalysisCompaniesDomains,
} from "../services/analyses/companies.js";
import { loadAnalysisCountries } from "../services/analyses/countries-store.js";
import { getAnalysis, updateAnalysis } from "../services/analyses/index.js";
import { analysisLog } from "../services/analyses/logger.js";
import { loadOpenAiKey } from "../services/analyses/openai-key.js";
import type { AnalysisRecord } from "../services/analyses/types.js";

interface EnrichDomainsEvent {
  analysisId: string;
  periodStart: string;
  periodEnd: string;
  countryCode: string;
}

const MAX_RESULTS = 80;

function appendResults(
  existing: AnalysisRecord["domainEnrichmentResults"],
  additions: NonNullable<AnalysisRecord["domainEnrichmentResults"]>
): NonNullable<AnalysisRecord["domainEnrichmentResults"]> {
  return [...additions, ...(existing ?? [])].slice(0, MAX_RESULTS);
}

async function shouldStopEnrichment(analysisId: string): Promise<boolean> {
  const current = await getAnalysis(analysisId);
  if (!current) return true;
  return (
    current.domainEnrichmentStatus === "cancelled" ||
    Boolean(current.domainEnrichmentCancelRequested)
  );
}

export const handler: Handler<EnrichDomainsEvent> = async (event) => {
  const { analysisId, periodStart, periodEnd, countryCode } = event;

  if (!analysisId || !periodStart || !periodEnd || !countryCode) {
    throw new Error("analysisId, periodStart, periodEnd, and countryCode are required");
  }

  const marketCode = countryCode.toUpperCase();

  await loadOpenAiKey();

  analysisLog({
    analysisId,
    phase: "domain_start",
    message: `Domain enrichment worker started for ${marketCode}`,
  });

  const existing = await getAnalysis(analysisId);
  if (!existing) {
    throw new Error("Analysis not found");
  }

  const marketLabel =
    (await loadAnalysisCountries(existing.periodStart, existing.periodEnd)).find(
      (entry) => entry.code === marketCode
    )?.location ?? marketCode;

  try {
    const companies = await loadAnalysisCompanies(periodStart, periodEnd);
    const inMarket = filterCompaniesByCountry(companies, marketCode);
    const missing = inMarket.filter((company) => !company.domain?.trim());

    if (await shouldStopEnrichment(analysisId)) {
      await updateAnalysis(analysisId, {
        domainEnrichmentStatus: "cancelled",
        domainEnrichmentCountryCode: marketCode,
        domainEnrichmentProgress: `${marketLabel}: stopped before start`,
        domainEnrichmentCancelRequested: false,
      });
      return;
    }

    if (missing.length === 0) {
      await updateAnalysis(analysisId, {
        domainEnrichmentStatus: "completed",
        domainEnrichmentCountryCode: marketCode,
        domainEnrichmentProgress: `All companies in ${marketLabel} already have domains`,
        domainEnrichmentProcessed: 0,
        domainEnrichmentTotal: 0,
        domainsEnrichedAt: new Date().toISOString(),
        domainEnrichmentError: undefined,
        domainEnrichmentCancelRequested: false,
      });
      return;
    }

    let enrichedTotal = 0;
    let processed = 0;
    let results = existing.domainEnrichmentResults ?? [];

    await updateAnalysis(analysisId, {
      domainEnrichmentStatus: "running",
      domainEnrichmentCountryCode: marketCode,
      domainEnrichmentStartedAt: new Date().toISOString(),
      domainEnrichmentProgress: `${marketLabel}: preparing ${missing.length} companies…`,
      domainEnrichmentProcessed: 0,
      domainEnrichmentTotal: missing.length,
      domainEnrichmentResults: [],
      domainEnrichmentError: undefined,
      domainEnrichmentCancelRequested: false,
    });
    results = [];

    for (let index = 0; index < missing.length; index += DOMAIN_LOOKUP_BATCH_SIZE) {
      if (await shouldStopEnrichment(analysisId)) {
        await updateAnalysis(analysisId, {
          domainEnrichmentStatus: "cancelled",
          domainEnrichmentProgress: `${marketLabel}: stopped · ${enrichedTotal} domains saved`,
          domainEnrichmentProcessed: processed,
          domainEnrichmentTotal: missing.length,
          domainEnrichmentResults: results,
          domainEnrichmentCancelRequested: false,
        });

        analysisLog({
          analysisId,
          phase: "domain_cancelled",
          message: `Domain enrichment cancelled for ${marketCode} after ${processed} companies`,
        });
        return;
      }

      const batch = missing.slice(index, index + DOMAIN_LOOKUP_BATCH_SIZE);
      const batchNames = batch.map((company) => company.name);

      await updateAnalysis(analysisId, {
        domainEnrichmentProgress: `${marketLabel}: looking up ${batchNames.join(", ")}…`,
        domainEnrichmentProcessed: processed,
        domainEnrichmentTotal: missing.length,
        domainEnrichmentResults: results,
      });

      if (await shouldStopEnrichment(analysisId)) {
        await updateAnalysis(analysisId, {
          domainEnrichmentStatus: "cancelled",
          domainEnrichmentProgress: `${marketLabel}: stopped · ${enrichedTotal} domains saved`,
          domainEnrichmentProcessed: processed,
          domainEnrichmentTotal: missing.length,
          domainEnrichmentResults: results,
          domainEnrichmentCancelRequested: false,
        });
        return;
      }

      const lookups = await resolveCompanyDomainsBatch(batchNames, { analysisId });

      if (await shouldStopEnrichment(analysisId)) {
        await updateAnalysis(analysisId, {
          domainEnrichmentStatus: "cancelled",
          domainEnrichmentProgress: `${marketLabel}: stopped · ${enrichedTotal} domains saved`,
          domainEnrichmentProcessed: processed,
          domainEnrichmentTotal: missing.length,
          domainEnrichmentResults: results,
          domainEnrichmentCancelRequested: false,
        });
        return;
      }
      const domainsToSave: Record<string, string> = {};

      for (const lookup of lookups) {
        if (lookup.domain) {
          domainsToSave[lookup.name] = lookup.domain;
        }
      }

      if (Object.keys(domainsToSave).length > 0) {
        enrichedTotal += await patchAnalysisCompaniesDomains(periodStart, periodEnd, domainsToSave);
      }

      processed += batch.length;
      results = appendResults(results, lookups);

      await updateAnalysis(analysisId, {
        domainEnrichmentProgress: `${marketLabel}: ${processed} / ${missing.length} · ${enrichedTotal} domains saved`,
        domainEnrichmentProcessed: processed,
        domainEnrichmentTotal: missing.length,
        domainEnrichmentResults: results,
      });
    }

    const refreshed = filterCompaniesByCountry(
      await loadAnalysisCompanies(periodStart, periodEnd),
      marketCode
    );
    const stillMissing = refreshed.filter((company) => !company.domain?.trim()).length;

    await updateAnalysis(analysisId, {
      domainEnrichmentStatus: "completed",
      domainEnrichmentCountryCode: marketCode,
      domainEnrichmentProgress:
        stillMissing > 0
          ? `${marketLabel}: ${enrichedTotal} domains saved · ${stillMissing} still unknown`
          : `${marketLabel}: ${enrichedTotal} domains saved`,
      domainEnrichmentProcessed: processed,
      domainEnrichmentTotal: missing.length,
      domainEnrichmentResults: results,
      domainsEnrichedAt: new Date().toISOString(),
      domainEnrichmentError: undefined,
      domainEnrichmentCancelRequested: false,
    });

    analysisLog({
      analysisId,
      phase: "domain_done",
      message: `Domain enrichment for ${marketCode}: ${enrichedTotal} added, ${stillMissing} missing`,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Domain enrichment failed";

    await updateAnalysis(analysisId, {
      domainEnrichmentStatus: "failed",
      domainEnrichmentCountryCode: marketCode,
      domainEnrichmentError: message,
      domainEnrichmentCancelRequested: false,
    });

    analysisLog({
      analysisId,
      phase: "domain_failed",
      message,
      error: message,
    });

    throw error;
  }
};
