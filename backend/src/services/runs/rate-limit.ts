import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, PutCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import type { ScrapeRegionId } from "../../shared/scrapeRegions.js";
import { manualTriggerRateLimitSk, isRateLimitRecord } from "./rate-limit-keys.js";

export const RATE_LIMIT_SK = "__manual_trigger_rate_limit__";

export interface ManualTriggerStatus {
  canTrigger: boolean;
  retryAfterSeconds: number;
  lastManualTriggeredAt?: string;
  lastRunAt?: string;
  cooldownMinutes: number;
  minRunGapMinutes: number;
  reason?: string;
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

function getCooldownMs(): number {
  const minutes = Number(process.env.MANUAL_FETCH_COOLDOWN_MINUTES ?? "30");
  return Math.max(5, minutes) * 60_000;
}

function getMinRunGapMs(): number {
  const minutes = Number(process.env.MANUAL_FETCH_MIN_GAP_MINUTES ?? "5");
  return Math.max(1, minutes) * 60_000;
}

async function getLastManualTriggerAt(
  stage: string,
  region: ScrapeRegionId
): Promise<string | undefined> {
  const tableName = getTableName();
  if (!tableName) return undefined;

  const response = await getDocClient().send(
    new GetCommand({
      TableName: tableName,
      Key: { stage, fetchedAt: manualTriggerRateLimitSk(region) },
    })
  );

  const value = response.Item?.lastManualTriggeredAt;
  return typeof value === "string" ? value : undefined;
}

async function getLatestRunAt(stage: string, region: ScrapeRegionId): Promise<string | undefined> {
  const tableName = getTableName();
  if (!tableName) return undefined;

  let cursor: string | undefined;

  do {
    const response = await getDocClient().send(
      new QueryCommand({
        TableName: tableName,
        KeyConditionExpression: "#stage = :stage",
        ExpressionAttributeNames: { "#stage": "stage" },
        ExpressionAttributeValues: { ":stage": stage },
        ScanIndexForward: false,
        Limit: 25,
        ...(cursor ? { ExclusiveStartKey: { stage, fetchedAt: cursor } } : {}),
      })
    );

    for (const item of response.Items ?? []) {
      const fetchedAt = item.fetchedAt;
      if (typeof fetchedAt !== "string") continue;
      if (isRateLimitRecord(fetchedAt, item.recordType as string | undefined)) continue;
      if ((item.scrapeRegion ?? "europe") === region) {
        return fetchedAt;
      }
    }

    cursor =
      typeof response.LastEvaluatedKey?.fetchedAt === "string"
        ? response.LastEvaluatedKey.fetchedAt
        : undefined;
  } while (cursor);

  return undefined;
}

export async function getManualTriggerStatus(
  region: ScrapeRegionId = "europe"
): Promise<ManualTriggerStatus> {
  const stage = process.env.APP_STAGE ?? "dev";
  const cooldownMs = getCooldownMs();
  const minRunGapMs = getMinRunGapMs();
  const cooldownMinutes = Math.round(cooldownMs / 60_000);
  const minRunGapMinutes = Math.round(minRunGapMs / 60_000);

  const [lastManualTriggeredAt, lastRunAt] = await Promise.all([
    getLastManualTriggerAt(stage, region),
    getLatestRunAt(stage, region),
  ]);

  const now = Date.now();

  if (lastManualTriggeredAt) {
    const manualElapsed = now - new Date(lastManualTriggeredAt).getTime();
    if (manualElapsed < cooldownMs) {
      const retryAfterSeconds = Math.ceil((cooldownMs - manualElapsed) / 1000);
      return {
        canTrigger: false,
        retryAfterSeconds,
        lastManualTriggeredAt,
        lastRunAt,
        cooldownMinutes,
        minRunGapMinutes,
        reason: `Manual fetch cooldown — wait ${Math.ceil(retryAfterSeconds / 60)} min`,
      };
    }
  }

  if (lastRunAt) {
    const runElapsed = now - new Date(lastRunAt).getTime();
    if (runElapsed < minRunGapMs) {
      const retryAfterSeconds = Math.ceil((minRunGapMs - runElapsed) / 1000);
      return {
        canTrigger: false,
        retryAfterSeconds,
        lastManualTriggeredAt,
        lastRunAt,
        cooldownMinutes,
        minRunGapMinutes,
        reason: `Recent run in progress or just finished — wait ${retryAfterSeconds}s`,
      };
    }
  }

  return {
    canTrigger: true,
    retryAfterSeconds: 0,
    lastManualTriggeredAt,
    lastRunAt,
    cooldownMinutes,
    minRunGapMinutes,
  };
}

export async function recordManualTrigger(region: ScrapeRegionId = "europe"): Promise<void> {
  const tableName = getTableName();
  if (!tableName) {
    throw new Error("RUNS_TABLE_NAME missing");
  }

  const stage = process.env.APP_STAGE ?? "dev";
  const now = new Date().toISOString();

  await getDocClient().send(
    new PutCommand({
      TableName: tableName,
      Item: {
        stage,
        fetchedAt: manualTriggerRateLimitSk(region),
        lastManualTriggeredAt: now,
        recordType: "manual_trigger_rate_limit",
        scrapeRegion: region,
      },
    })
  );
}
