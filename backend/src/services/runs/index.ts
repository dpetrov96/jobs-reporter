import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, PutCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import type { CountryRunResult } from "../linkedin/index.js";
import type { SendEmailResult } from "../email/types.js";
import type { ScrapeRegionId } from "../../shared/scrapeRegions.js";
import {
  getDayUtcBounds,
  getScrapeRegion,
  regionDateKey,
} from "../../shared/scrapeRegions.js";
import { RATE_LIMIT_SK } from "./rate-limit.js";
import { gunzipCountries } from "../report/slimDailyCountries.js";

function isJobRunItem(item: unknown): item is JobRunRecord {
  if (!item || typeof item !== "object") return false;

  const record = item as Partial<JobRunRecord> & { recordType?: string };
  if (typeof record.fetchedAt !== "string") return false;
  if (record.fetchedAt === RATE_LIMIT_SK) return false;
  if (record.recordType === "manual_trigger_rate_limit") return false;
  if (Number.isNaN(Date.parse(record.fetchedAt))) return false;

  if (Array.isArray(record.countries) && record.countries.length > 0) return true;
  if (Array.isArray(record.categories)) return true;
  // Light list projections may omit countries/categories.
  if (typeof record.totalJobs === "number") return true;

  return false;
}

export type ReportKind = "hourly" | "daily";

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
  scrapeRegion?: ScrapeRegionId;
  /** Absent or "hourly" for scrape runs; "daily" for end-of-day summaries. */
  reportKind?: ReportKind;
  dayKey?: string;
  dayLabel?: string;
  scrapeCount?: number;
  /** Gzipped JSON of full countries (daily summaries that exceed item size). */
  countriesGzip?: Uint8Array;
  /** @deprecated Legacy single-country runs */
  categories?: Array<{ keyword: string; jobs: unknown[] }>;
}

export interface SaveJobRunInput {
  location: string;
  fetchedAt: string;
  postedWithin?: string;
  postedWithinLabel: string;
  countries: CountryRunResult[];
  countryCount?: number;
  scrapeRegion?: ScrapeRegionId;
  reportKind?: ReportKind;
  dayKey?: string;
  dayLabel?: string;
  scrapeCount?: number;
  countriesGzip?: Uint8Array;
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
    postedWithin: input.postedWithin ?? "",
    postedWithinLabel: input.postedWithinLabel,
    totalJobs,
    countryCount: input.countryCount ?? input.countries.length,
    categoryCount: countCategories(input.countries),
    countries: input.countries,
    scrapeRegion: input.scrapeRegion ?? "europe",
    reportKind: input.reportKind ?? "hourly",
    dayKey: input.dayKey,
    dayLabel: input.dayLabel,
    scrapeCount: input.scrapeCount,
    countriesGzip: input.countriesGzip,
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

const LIST_LIGHT_PROJECTION =
  "#stage, fetchedAt, scrapeRegion, reportKind, dayKey, dayLabel, totalJobs, countryCount, scrapeCount, postedWithinLabel, postedWithin, #loc, emailSent, emailSkipped, emailReason, categoryCount";

export async function listJobRuns(
  limit = 20,
  cursor?: string,
  options: { light?: boolean } = {}
): Promise<ListJobRunsResult> {
  const tableName = getTableName();

  if (!tableName) {
    return { runs: [] };
  }

  const stage = process.env.APP_STAGE ?? "dev";
  const fetchLimit = Math.min(Math.max(limit * 5, limit), 50);
  const light = options.light === true;
  const response = await getDocClient().send(
    new QueryCommand({
      TableName: tableName,
      KeyConditionExpression: "#stage = :stage",
      ExpressionAttributeNames: light
        ? { "#stage": "stage", "#loc": "location" }
        : { "#stage": "stage" },
      ExpressionAttributeValues: { ":stage": stage },
      ScanIndexForward: false,
      Limit: fetchLimit,
      ...(light
        ? { ProjectionExpression: LIST_LIGHT_PROJECTION }
        : {}),
      ...(cursor
        ? { ExclusiveStartKey: { stage, fetchedAt: cursor } }
        : {}),
    })
  );

  const runs = (response.Items ?? []).filter(isJobRunItem).slice(0, limit);
  const nextCursor =
    typeof response.LastEvaluatedKey?.fetchedAt === "string"
      ? response.LastEvaluatedKey.fetchedAt
      : undefined;

  return { runs, nextCursor };
}

export async function listJobRunsInPeriod(
  periodStart: string,
  periodEnd: string
): Promise<JobRunRecord[]> {
  const all: JobRunRecord[] = [];
  let cursor: string | undefined;

  do {
    const page = await listJobRunsInPeriodPage(periodStart, periodEnd, 10, cursor);
    all.push(...page.runs);
    cursor = page.nextCursor;
  } while (cursor);

  return all;
}

export interface ListJobRunsInPeriodPageResult {
  runs: JobRunRecord[];
  nextCursor?: string;
}

export async function listJobRunsInPeriodPage(
  periodStart: string,
  periodEnd: string,
  limit = 10,
  cursor?: string
): Promise<ListJobRunsInPeriodPageResult> {
  const tableName = getTableName();

  if (!tableName) {
    return { runs: [] };
  }

  const stage = process.env.APP_STAGE ?? "dev";
  const response = await getDocClient().send(
    new QueryCommand({
      TableName: tableName,
      KeyConditionExpression: "#stage = :stage AND #fetchedAt BETWEEN :start AND :end",
      ExpressionAttributeNames: {
        "#stage": "stage",
        "#fetchedAt": "fetchedAt",
      },
      ExpressionAttributeValues: {
        ":stage": stage,
        ":start": periodStart,
        ":end": periodEnd,
      },
      ScanIndexForward: false,
      Limit: Math.min(Math.max(limit, 1), 25),
      ...(cursor
        ? { ExclusiveStartKey: { stage, fetchedAt: cursor } }
        : {}),
    })
  );

  const runs = (response.Items ?? []).filter(isJobRunItem);
  const nextCursor =
    typeof response.LastEvaluatedKey?.fetchedAt === "string"
      ? response.LastEvaluatedKey.fetchedAt
      : undefined;

  return { runs, nextCursor };
}

export type ReportKindFilter = "all" | "hourly" | "daily";

function matchesReportKind(run: JobRunRecord, kind: ReportKindFilter): boolean {
  if (kind === "all") return true;
  const isDaily = run.reportKind === "daily";
  return kind === "daily" ? isDaily : !isDaily;
}

export async function listJobRunsFiltered(
  limit = 20,
  cursor?: string,
  reportKind: ReportKindFilter = "all",
  regionId?: ScrapeRegionId
): Promise<ListJobRunsResult> {
  if (reportKind === "all" && !regionId) {
    return listJobRuns(limit, cursor);
  }

  const matched: JobRunRecord[] = [];
  let scanCursor = cursor;
  let nextCursor: string | undefined;
  let pages = 0;
  const maxPages = reportKind === "all" ? 40 : 80;
  const pageSize = reportKind === "all" ? Math.min(limit * 5, 50) : 50;

  while (matched.length < limit && pages < maxPages) {
    pages += 1;
    const page = await listJobRuns(pageSize, scanCursor, {
      light: reportKind !== "all",
    });

    for (const run of page.runs) {
      if (regionId && (run.scrapeRegion ?? "europe") !== regionId) continue;
      if (!matchesReportKind(run, reportKind)) continue;
      matched.push(run);
      if (matched.length >= limit) break;
    }

    nextCursor = page.nextCursor;

    if (matched.length >= limit || !page.nextCursor) {
      break;
    }

    scanCursor = page.nextCursor;
  }

  return {
    runs: matched.slice(0, limit),
    nextCursor: matched.length >= limit ? nextCursor : undefined,
  };
}

export async function listJobRunsForRegion(
  regionId: ScrapeRegionId,
  limit = 20,
  cursor?: string,
  reportKind: ReportKindFilter = "all"
): Promise<ListJobRunsResult> {
  return listJobRunsFiltered(limit, cursor, reportKind, regionId);
}

export async function listJobRunsForRegionDay(
  scrapeRegion: ScrapeRegionId,
  dayKey: string
): Promise<JobRunRecord[]> {
  const region = getScrapeRegion(scrapeRegion);
  const { start, end } = getDayUtcBounds(dayKey, region.timezone);
  const all = await listJobRunsInPeriod(start, end);

  return all
    .filter(
      (run) =>
        (run.scrapeRegion ?? "europe") === scrapeRegion &&
        regionDateKey(run.fetchedAt, region.timezone) === dayKey
    )
    .sort((a, b) => Date.parse(a.fetchedAt) - Date.parse(b.fetchedAt));
}

/** Strip job listings + gzip blobs for list API responses (keeps payload under Lambda limits). */
export function projectRunForList(run: JobRunRecord): JobRunRecord {
  const { countriesGzip: _gzip, categories: _legacy, ...rest } = run;
  return {
    ...rest,
    countries: (run.countries ?? []).map((country) => ({
      location: country.location,
      geoId: country.geoId,
      flag: country.flag,
      code: country.code,
      totalJobs: country.totalJobs,
      categories: [],
    })),
  };
}

export function hydrateJobRunCountries(run: JobRunRecord): JobRunRecord {
  if (!run.countriesGzip) return run;

  try {
    const countries = gunzipCountries(run.countriesGzip);
    const { countriesGzip: _omit, ...rest } = run;
    return { ...rest, countries };
  } catch {
    return run;
  }
}

export async function getJobRun(fetchedAt: string): Promise<JobRunRecord | null> {
  const tableName = getTableName();

  if (!tableName) {
    return null;
  }

  if (fetchedAt === RATE_LIMIT_SK) {
    return null;
  }

  const stage = process.env.APP_STAGE ?? "dev";
  const response = await getDocClient().send(
    new GetCommand({
      TableName: tableName,
      Key: { stage, fetchedAt },
    })
  );

  const item = response.Item;
  if (!isJobRunItem(item)) return null;
  return hydrateJobRunCountries(item);
}
