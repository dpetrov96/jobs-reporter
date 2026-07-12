import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  QueryCommand,
} from "@aws-sdk/lib-dynamodb";
import { triggerAnalysisRun } from "./trigger.js";
import {
  deleteAnalysisCompanies,
  loadAnalysisCompanies,
  saveAnalysisCompanies,
} from "./companies.js";
import {
  deleteAnalysisCountries,
  loadAnalysisCountries,
  saveAnalysisCountries,
} from "./countries-store.js";
import {
  ANALYSIS_SK_PREFIX,
  buildAnalysisId,
  type AnalysisRecord,
  type AnalysisStatus,
} from "./types.js";

export type { AnalysisRecord, AnalysisStatus };
export { buildAnalysisId, normalizePeriodInput } from "./types.js";
export { saveAnalysisCompanies } from "./companies.js";

const ANALYSIS_STALE_MS = 6 * 60 * 1000;
const DOMAIN_ENRICHMENT_STALE_MS = 15 * 60 * 1000;

export async function reconcileDomainEnrichmentStatus(
  analysis: AnalysisRecord
): Promise<AnalysisRecord> {
  if (
    analysis.domainEnrichmentStatus !== "running" &&
    analysis.domainEnrichmentStatus !== "pending"
  ) {
    return analysis;
  }

  if (analysis.domainEnrichmentCancelRequested) {
    return updateAnalysis(analysis.fetchedAt, {
      domainEnrichmentStatus: "cancelled",
      domainEnrichmentCancelRequested: false,
      domainEnrichmentProgress: analysis.domainEnrichmentProgress?.includes("stopped")
        ? analysis.domainEnrichmentProgress
        : `${analysis.domainEnrichmentProgress ?? "Domain lookup"} · stopped`,
    });
  }

  const reference = analysis.domainEnrichmentStartedAt ?? analysis.startedAt ?? analysis.createdAt;
  const elapsed = Date.now() - Date.parse(reference);

  if (analysis.domainEnrichmentStatus === "pending" && elapsed > 3 * 60 * 1000) {
    return updateAnalysis(analysis.fetchedAt, {
      domainEnrichmentStatus: "failed",
      domainEnrichmentError: "Domain lookup worker did not start. Try again.",
      domainEnrichmentCancelRequested: false,
    });
  }

  if (elapsed < DOMAIN_ENRICHMENT_STALE_MS) {
    return analysis;
  }

  return updateAnalysis(analysis.fetchedAt, {
    domainEnrichmentStatus: "failed",
    domainEnrichmentError: "Domain enrichment timed out. Try again.",
    domainEnrichmentCancelRequested: false,
  });
}

export async function reconcileAnalysisStatus(
  analysis: AnalysisRecord
): Promise<AnalysisRecord> {
  if (analysis.status !== "pending" && analysis.status !== "running") {
    return analysis;
  }

  const reference = analysis.startedAt ?? analysis.createdAt;
  const elapsed = Date.now() - Date.parse(reference);

  if (elapsed < ANALYSIS_STALE_MS) {
    return analysis;
  }

  return updateAnalysis(analysis.fetchedAt, {
    status: "failed",
    completedAt: new Date().toISOString(),
    error:
      "Анализът изтече (timeout). Опитай отново — за големи периоди избери един ден.",
  });
}

export async function reanalyzeAnalysis(analysisId: string): Promise<AnalysisRecord> {
  const existing = await getAnalysis(analysisId);
  if (!existing) {
    throw new Error("Analysis not found");
  }

  if (existing.status === "pending" || existing.status === "running") {
    throw new Error("Analysis is already in progress");
  }

  await deleteAnalysisCompanies(existing.periodStart, existing.periodEnd);
  await deleteAnalysisCountries(existing.periodStart, existing.periodEnd);

  const reset: AnalysisRecord = {
    stage: existing.stage,
    fetchedAt: existing.fetchedAt,
    recordType: "analysis",
    periodStart: existing.periodStart,
    periodEnd: existing.periodEnd,
    periodLabel: existing.periodLabel,
    status: "pending",
    createdAt: existing.createdAt,
    runCount: 0,
    totalJobs: 0,
    uniqueJobs: 0,
    countries: [],
    progressMessage: "Изчаква старт на worker…",
  };

  await getDocClient().send(
    new PutCommand({
      TableName: getTableName()!,
      Item: reset,
    })
  );

  await triggerAnalysisRun(
    existing.fetchedAt,
    existing.periodStart,
    existing.periodEnd
  );

  return reset;
}

export async function cancelAnalysis(analysisId: string): Promise<AnalysisRecord | null> {
  const analysis = await getAnalysis(analysisId);
  if (!analysis) return null;

  if (analysis.status !== "pending" && analysis.status !== "running") {
    return analysis;
  }

  return updateAnalysis(analysisId, {
    status: "failed",
    completedAt: new Date().toISOString(),
    error: "Спрян от потребителя",
  });
}

export async function cancelDomainEnrichment(analysisId: string): Promise<AnalysisRecord | null> {
  const analysis = await getAnalysis(analysisId);
  if (!analysis) return null;

  if (analysis.domainEnrichmentStatus !== "running" && analysis.domainEnrichmentStatus !== "pending") {
    return analysis;
  }

  const progress = analysis.domainEnrichmentProgress?.includes("stopped")
    ? analysis.domainEnrichmentProgress
    : analysis.domainEnrichmentProgress
      ? `${analysis.domainEnrichmentProgress} · stopped`
      : "Domain lookup stopped";

  return updateAnalysis(analysisId, {
    domainEnrichmentStatus: "cancelled",
    domainEnrichmentCancelRequested: false,
    domainEnrichmentProgress: progress,
  });
}

let docClient: DynamoDBDocumentClient | undefined;

function getDocClient(): DynamoDBDocumentClient {
  if (!docClient) {
    const region = process.env.AWS_REGION ?? "eu-central-1";
    docClient = DynamoDBDocumentClient.from(new DynamoDBClient({ region }), {
      marshallOptions: { removeUndefinedValues: true },
    });
  }

  return docClient;
}

function getTableName(): string | undefined {
  return process.env.RUNS_TABLE_NAME?.trim() || undefined;
}

function getStage(): string {
  return process.env.APP_STAGE ?? "dev";
}

function isAnalysisItem(item: unknown): item is AnalysisRecord {
  if (!item || typeof item !== "object") return false;

  const record = item as Partial<AnalysisRecord>;
  return (
    record.recordType === "analysis" &&
    typeof record.fetchedAt === "string" &&
    record.fetchedAt.startsWith(ANALYSIS_SK_PREFIX)
  );
}

export interface CreateAnalysisInput {
  periodStart: string;
  periodEnd: string;
  periodLabel?: string;
}

export async function getAnalysis(analysisId: string): Promise<AnalysisRecord | null> {
  const tableName = getTableName();
  if (!tableName) return null;

  const response = await getDocClient().send(
    new GetCommand({
      TableName: tableName,
      Key: { stage: getStage(), fetchedAt: analysisId },
    })
  );

  return isAnalysisItem(response.Item) ? response.Item : null;
}

export async function getAnalysisWithCompanies(
  analysisId: string
): Promise<AnalysisRecord | null> {
  const analysis = await getAnalysis(analysisId);
  if (!analysis) return null;

  const [companies, countries] = await Promise.all([
    loadAnalysisCompanies(analysis.periodStart, analysis.periodEnd),
    loadAnalysisCountries(analysis.periodStart, analysis.periodEnd),
  ]);

  return {
    ...analysis,
    countries,
    countryCount: countries.length > 0 ? countries.length : analysis.countryCount,
    ...(companies.length > 0
      ? {
          globalCompanies: companies,
          uniqueCompanies: analysis.uniqueCompanies ?? companies.length,
        }
      : {}),
  };
}

export async function getAnalysisForPeriod(
  periodStart: string,
  periodEnd: string
): Promise<AnalysisRecord | null> {
  return getAnalysis(buildAnalysisId(periodStart, periodEnd));
}

export async function resetFailedAnalysis(
  input: CreateAnalysisInput
): Promise<AnalysisRecord> {
  const analysisId = buildAnalysisId(input.periodStart, input.periodEnd);
  const now = new Date().toISOString();

  const record: AnalysisRecord = {
    stage: getStage(),
    fetchedAt: analysisId,
    recordType: "analysis",
    periodStart: input.periodStart,
    periodEnd: input.periodEnd,
    periodLabel: input.periodLabel,
    status: "pending",
    createdAt: now,
    runCount: 0,
    totalJobs: 0,
    uniqueJobs: 0,
    countries: [],
  };

  await getDocClient().send(
    new PutCommand({
      TableName: getTableName()!,
      Item: record,
    })
  );

  return record;
}

export async function createPendingAnalysis(
  input: CreateAnalysisInput
): Promise<AnalysisRecord> {
  const tableName = getTableName();
  if (!tableName) {
    throw new Error("RUNS_TABLE_NAME missing");
  }

  const now = new Date().toISOString();
  const analysisId = buildAnalysisId(input.periodStart, input.periodEnd);

  const record: AnalysisRecord = {
    stage: getStage(),
    fetchedAt: analysisId,
    recordType: "analysis",
    periodStart: input.periodStart,
    periodEnd: input.periodEnd,
    periodLabel: input.periodLabel,
    status: "pending",
    createdAt: now,
    runCount: 0,
    totalJobs: 0,
    uniqueJobs: 0,
    countries: [],
  };

  await getDocClient().send(
    new PutCommand({
      TableName: tableName,
      Item: record,
      ConditionExpression: "attribute_not_exists(#fetchedAt)",
      ExpressionAttributeNames: { "#fetchedAt": "fetchedAt" },
    })
  );

  return record;
}

export async function updateAnalysis(
  analysisId: string,
  patch: Partial<AnalysisRecord>
): Promise<AnalysisRecord> {
  const tableName = getTableName();
  if (!tableName) {
    throw new Error("RUNS_TABLE_NAME missing");
  }

  const existing = await getAnalysis(analysisId);
  if (!existing) {
    throw new Error("Analysis not found");
  }

  const { globalCompanies: _existingCompanies, countries: _existingCountries, ...existingCore } =
    existing;
  const { globalCompanies: _patchCompanies, countries: _patchCountries, ...patchCore } = patch;

  const updated: AnalysisRecord = {
    ...existingCore,
    ...patchCore,
    stage: existing.stage,
    fetchedAt: existing.fetchedAt,
    recordType: "analysis",
    periodStart: existing.periodStart,
    periodEnd: existing.periodEnd,
  };

  await getDocClient().send(
    new PutCommand({
      TableName: tableName,
      Item: updated,
    })
  );

  return updated;
}

export interface ListAnalysesResult {
  analyses: AnalysisRecord[];
  nextCursor?: string;
}

export async function listAnalyses(limit = 20, cursor?: string): Promise<ListAnalysesResult> {
  const tableName = getTableName();
  if (!tableName) {
    return { analyses: [] };
  }

  const fetchLimit = Math.min(Math.max(limit * 3, limit), 50);
  const response = await getDocClient().send(
    new QueryCommand({
      TableName: tableName,
      KeyConditionExpression: "#stage = :stage AND begins_with(#fetchedAt, :prefix)",
      ExpressionAttributeNames: {
        "#stage": "stage",
        "#fetchedAt": "fetchedAt",
      },
      ExpressionAttributeValues: {
        ":stage": getStage(),
        ":prefix": ANALYSIS_SK_PREFIX,
      },
      ScanIndexForward: false,
      Limit: fetchLimit,
      ...(cursor
        ? { ExclusiveStartKey: { stage: getStage(), fetchedAt: cursor } }
        : {}),
    })
  );

  const analyses = (response.Items ?? []).filter(isAnalysisItem).slice(0, limit);
  const nextCursor =
    typeof response.LastEvaluatedKey?.fetchedAt === "string"
      ? response.LastEvaluatedKey.fetchedAt
      : undefined;

  return { analyses, nextCursor };
}
