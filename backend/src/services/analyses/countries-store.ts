import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  DeleteCommand,
  PutCommand,
  QueryCommand,
} from "@aws-sdk/lib-dynamodb";
import type { CountryAnalysisResult } from "./types.js";
import { sortByCountryDisplayOrder } from "../../shared/countries.js";

export const ANALYSIS_COUNTRY_SK_PREFIX = "__analysis__country__";

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

function getTableName(): string {
  const tableName = process.env.RUNS_TABLE_NAME?.trim();
  if (!tableName) throw new Error("RUNS_TABLE_NAME missing");
  return tableName;
}

function getStage(): string {
  return process.env.APP_STAGE ?? "dev";
}

export function buildCountryChunkId(
  periodStart: string,
  periodEnd: string,
  countryCode: string
): string {
  return `${ANALYSIS_COUNTRY_SK_PREFIX}${periodStart}__${periodEnd}__${countryCode}`;
}

function buildCountryKeyPrefix(periodStart: string, periodEnd: string): string {
  return `${ANALYSIS_COUNTRY_SK_PREFIX}${periodStart}__${periodEnd}__`;
}

interface CountryChunkRecord {
  stage: string;
  fetchedAt: string;
  recordType: "analysis_country";
  periodStart: string;
  periodEnd: string;
  country: CountryAnalysisResult;
}

export async function saveAnalysisCountries(
  periodStart: string,
  periodEnd: string,
  countries: CountryAnalysisResult[]
): Promise<void> {
  await deleteAnalysisCountries(periodStart, periodEnd);

  const tableName = getTableName();
  const stage = getStage();

  for (const country of countries) {
    const record: CountryChunkRecord = {
      stage,
      fetchedAt: buildCountryChunkId(periodStart, periodEnd, country.code),
      recordType: "analysis_country",
      periodStart,
      periodEnd,
      country,
    };

    await getDocClient().send(
      new PutCommand({
        TableName: tableName,
        Item: record,
      })
    );
  }
}

export async function loadAnalysisCountries(
  periodStart: string,
  periodEnd: string
): Promise<CountryAnalysisResult[]> {
  const tableName = getTableName();
  const stage = getStage();
  const prefix = buildCountryKeyPrefix(periodStart, periodEnd);

  const response = await getDocClient().send(
    new QueryCommand({
      TableName: tableName,
      KeyConditionExpression: "#stage = :stage AND begins_with(#fetchedAt, :prefix)",
      ExpressionAttributeNames: {
        "#stage": "stage",
        "#fetchedAt": "fetchedAt",
      },
      ExpressionAttributeValues: {
        ":stage": stage,
        ":prefix": prefix,
      },
    })
  );

  const countries = (response.Items ?? [])
    .filter(
      (item): item is CountryChunkRecord =>
        typeof item === "object" &&
        item != null &&
        (item as CountryChunkRecord).recordType === "analysis_country"
    )
    .map((item) => item.country);

  return sortByCountryDisplayOrder(countries);
}

export async function deleteAnalysisCountries(
  periodStart: string,
  periodEnd: string
): Promise<void> {
  const tableName = getTableName();
  const stage = getStage();
  const prefix = buildCountryKeyPrefix(periodStart, periodEnd);

  const response = await getDocClient().send(
    new QueryCommand({
      TableName: tableName,
      KeyConditionExpression: "#stage = :stage AND begins_with(#fetchedAt, :prefix)",
      ExpressionAttributeNames: {
        "#stage": "stage",
        "#fetchedAt": "fetchedAt",
      },
      ExpressionAttributeValues: {
        ":stage": stage,
        ":prefix": prefix,
      },
    })
  );

  for (const item of response.Items ?? []) {
    const fetchedAt = (item as { fetchedAt?: string }).fetchedAt;
    if (!fetchedAt) continue;

    await getDocClient().send(
      new DeleteCommand({
        TableName: tableName,
        Key: { stage, fetchedAt },
      })
    );
  }
}
