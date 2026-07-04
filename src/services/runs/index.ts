import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import type { JobCategoryResult } from "../linkedin/types.js";
import type { SendEmailResult } from "../email/types.js";

export interface JobRunRecord {
  stage: string;
  fetchedAt: string;
  location: string;
  postedWithin: string;
  postedWithinLabel: string;
  totalJobs: number;
  categoryCount: number;
  categories: JobCategoryResult[];
  emailSent: boolean;
  emailSkipped: boolean;
  emailReason?: string;
}

export interface SaveJobRunInput {
  location: string;
  fetchedAt: string;
  postedWithin: string;
  postedWithinLabel: string;
  categories: JobCategoryResult[];
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
  const totalJobs = input.categories.reduce((sum, category) => sum + category.jobs.length, 0);

  const record: JobRunRecord = {
    stage,
    fetchedAt: input.fetchedAt,
    location: input.location,
    postedWithin: input.postedWithin,
    postedWithinLabel: input.postedWithinLabel,
    totalJobs,
    categoryCount: input.categories.length,
    categories: input.categories,
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

export async function listJobRuns(limit = 20): Promise<JobRunRecord[]> {
  const tableName = getTableName();

  if (!tableName) {
    return [];
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
    })
  );

  return (response.Items ?? []) as JobRunRecord[];
}
