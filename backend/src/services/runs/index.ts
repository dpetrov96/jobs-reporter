import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, PutCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import type { CountryRunResult } from "../linkedin/index.js";
import type { SendEmailResult } from "../email/types.js";

export interface JobRunRecord {
  stage: string;
  fetchedAt: string;
  location: string;
  postedWithin: string;
  postedWithinLabel: string;
  totalJobs: number;
  countryCount: number;
  categoryCount: number;
  countries: CountryRunResult[];
  emailSent: boolean;
  emailSkipped: boolean;
  emailReason?: string;
}

export interface SaveJobRunInput {
  location: string;
  fetchedAt: string;
  postedWithin: string;
  postedWithinLabel: string;
  countries: CountryRunResult[];
  countryCount?: number;
}

export type SaveJobRunResult =
  | { saved: true; tableName: string; fetchedAt: string }
  | { saved: false; skipped: true; reason: string };

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

function countCategories(countries: CountryRunResult[]): number {
  return countries.reduce((sum, country) => sum + country.categories.length, 0);
}

export async function saveJobRun(
  input: SaveJobRunInput,
  emailResult?: SendEmailResult | null
): Promise<SaveJobRunResult> {
  const tableName = getTableName();

  if (!tableName) {
    return {
      saved: false,
      skipped: true,
      reason: "RUNS_TABLE_NAME missing — run sam deploy to create the DynamoDB table",
    };
  }

  const stage = process.env.APP_STAGE ?? "dev";
  const totalJobs = input.countries.reduce((sum, country) => sum + country.totalJobs, 0);

  const record: JobRunRecord = {
    stage,
    fetchedAt: input.fetchedAt,
    location: input.location,
    postedWithin: input.postedWithin,
    postedWithinLabel: input.postedWithinLabel,
    totalJobs,
    countryCount: input.countryCount ?? input.countries.length,
    categoryCount: countCategories(input.countries),
    countries: input.countries,
    emailSent: emailResult?.sent === true,
    emailSkipped: emailResult?.sent === false,
    emailReason:
      emailResult?.sent === false && "reason" in emailResult ? emailResult.reason : undefined,
  };

  await getDocClient().send(
    new PutCommand({
      TableName: tableName,
      Item: record,
    })
  );

  return { saved: true, tableName, fetchedAt: input.fetchedAt };
}

export interface ListJobRunsResult {
  runs: JobRunRecord[];
  nextCursor?: string;
}

export async function listJobRuns(
  limit = 20,
  cursor?: string
): Promise<ListJobRunsResult> {
  const tableName = getTableName();

  if (!tableName) {
    return { runs: [] };
  }

  const stage = process.env.APP_STAGE ?? "dev";
  const response = await getDocClient().send(
    new QueryCommand({
      TableName: tableName,
      KeyConditionExpression: "#stage = :stage",
      ExpressionAttributeNames: { "#stage": "stage" },
      ExpressionAttributeValues: { ":stage": stage },
      ScanIndexForward: false,
      Limit: limit,
      ...(cursor
        ? { ExclusiveStartKey: { stage, fetchedAt: cursor } }
        : {}),
    })
  );

  const runs = (response.Items ?? []) as JobRunRecord[];
  const nextCursor =
    typeof response.LastEvaluatedKey?.fetchedAt === "string"
      ? response.LastEvaluatedKey.fetchedAt
      : undefined;

  return { runs, nextCursor };
}

export async function getJobRun(fetchedAt: string): Promise<JobRunRecord | null> {
  const tableName = getTableName();

  if (!tableName) {
    return null;
  }

  const stage = process.env.APP_STAGE ?? "dev";
  const response = await getDocClient().send(
    new GetCommand({
      TableName: tableName,
      Key: { stage, fetchedAt },
    })
  );

  return (response.Item as JobRunRecord | undefined) ?? null;
}
