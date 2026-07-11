import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  QueryCommand,
} from "@aws-sdk/lib-dynamodb";
import {
  ANALYSIS_SK_PREFIX,
  buildAnalysisId,
  type AnalysisRecord,
  type AnalysisStatus,
} from "./types.js";

export type { AnalysisRecord, AnalysisStatus };
export { buildAnalysisId, normalizePeriodInput } from "./types.js";

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

export async function getAnalysisForPeriod(
  periodStart: string,
  periodEnd: string
): Promise<AnalysisRecord | null> {
  return getAnalysis(buildAnalysisId(periodStart, periodEnd));
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

  const updated: AnalysisRecord = {
    ...existing,
    ...patch,
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
