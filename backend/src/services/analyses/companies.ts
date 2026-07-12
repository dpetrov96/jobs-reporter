import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  DeleteCommand,
  PutCommand,
  QueryCommand,
} from "@aws-sdk/lib-dynamodb";

export const ANALYSIS_COMPANIES_SK_PREFIX = "__analysis__companies__";

const CHUNK_SIZE = 600;
const LOGO_URL_LIMIT = 100;

export interface CompanyCountryStat {
  code: string;
  count: number;
}

export interface CompanyHiringItem {
  name: string;
  count: number;
  logoUrl?: string;
  url?: string;
  domain?: string;
  countries?: CompanyCountryStat[];
}

interface CompaniesChunkRecord {
  stage: string;
  fetchedAt: string;
  recordType: "analysis_companies";
  periodStart: string;
  periodEnd: string;
  chunkIndex: number;
  totalChunks: number;
  companies: CompanyHiringItem[];
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

function getTableName(): string {
  const tableName = process.env.RUNS_TABLE_NAME?.trim();
  if (!tableName) throw new Error("RUNS_TABLE_NAME missing");
  return tableName;
}

function getStage(): string {
  return process.env.APP_STAGE ?? "dev";
}

export function buildCompaniesChunkId(
  periodStart: string,
  periodEnd: string,
  chunkIndex: number
): string {
  return `${ANALYSIS_COMPANIES_SK_PREFIX}${periodStart}__${periodEnd}__${chunkIndex}`;
}

function buildCompaniesKeyPrefix(periodStart: string, periodEnd: string): string {
  return `${ANALYSIS_COMPANIES_SK_PREFIX}${periodStart}__${periodEnd}__`;
}

function compactCompany(company: CompanyHiringItem, globalIndex: number): CompanyHiringItem {
  const core: CompanyHiringItem = {
    name: company.name,
    count: company.count,
    ...(company.domain ? { domain: company.domain } : {}),
    ...(company.countries?.length ? { countries: company.countries } : {}),
  };

  if (globalIndex < LOGO_URL_LIMIT) {
    return {
      ...core,
      logoUrl: company.logoUrl,
      url: company.url,
    };
  }

  return core;
}

function normalizeCompanyKey(name: string): string {
  return name.trim().toLowerCase();
}

export function normalizeCompanyDomain(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  let hostname = trimmed;
  try {
    if (/^https?:\/\//i.test(trimmed)) {
      hostname = new URL(trimmed).hostname;
    } else {
      hostname = trimmed.split("/")[0] ?? trimmed;
    }
  } catch {
    hostname = trimmed.split("/")[0] ?? trimmed;
  }

  hostname = hostname.replace(/^www\./i, "").toLowerCase();
  if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/.test(hostname)) {
    return null;
  }

  return hostname;
}

export function filterCompaniesByCountry(
  companies: CompanyHiringItem[],
  countryCode: string
): CompanyHiringItem[] {
  const code = countryCode.toUpperCase();
  return companies.filter((company) =>
    company.countries?.some((entry) => entry.code === code)
  );
}

export async function patchAnalysisCompaniesDomains(
  periodStart: string,
  periodEnd: string,
  domainsByName: Record<string, string>
): Promise<number> {
  const companies = await loadAnalysisCompanies(periodStart, periodEnd);
  if (companies.length === 0) return 0;

  const domainMap = new Map<string, string>();
  for (const [name, domain] of Object.entries(domainsByName)) {
    const normalized = normalizeCompanyDomain(domain);
    if (normalized) {
      domainMap.set(normalizeCompanyKey(name), normalized);
    }
  }

  if (domainMap.size === 0) return 0;

  let updated = 0;
  const merged = companies.map((company) => {
    if (company.domain) return company;

    const domain = domainMap.get(normalizeCompanyKey(company.name));
    if (!domain) return company;

    updated += 1;
    return { ...company, domain };
  });

  if (updated > 0) {
    await saveAnalysisCompanies(periodStart, periodEnd, merged);
  }

  return updated;
}

export async function saveAnalysisCompanies(
  periodStart: string,
  periodEnd: string,
  companies: CompanyHiringItem[]
): Promise<void> {
  await deleteAnalysisCompanies(periodStart, periodEnd);

  if (companies.length === 0) return;

  const totalChunks = Math.ceil(companies.length / CHUNK_SIZE);
  const tableName = getTableName();
  const stage = getStage();

  for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex += 1) {
    const sliceStart = chunkIndex * CHUNK_SIZE;
    const slice = companies.slice(sliceStart, sliceStart + CHUNK_SIZE).map((company, index) =>
      compactCompany(company, sliceStart + index)
    );

    const record: CompaniesChunkRecord = {
      stage,
      fetchedAt: buildCompaniesChunkId(periodStart, periodEnd, chunkIndex),
      recordType: "analysis_companies",
      periodStart,
      periodEnd,
      chunkIndex,
      totalChunks,
      companies: slice,
    };

    await getDocClient().send(
      new PutCommand({
        TableName: tableName,
        Item: record,
      })
    );
  }
}

export async function loadAnalysisCompanies(
  periodStart: string,
  periodEnd: string
): Promise<CompanyHiringItem[]> {
  const tableName = getTableName();
  const stage = getStage();
  const prefix = buildCompaniesKeyPrefix(periodStart, periodEnd);

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

  const chunks = (response.Items ?? [])
    .filter(
      (item): item is CompaniesChunkRecord =>
        typeof item === "object" &&
        item != null &&
        (item as CompaniesChunkRecord).recordType === "analysis_companies"
    )
    .sort((a, b) => a.chunkIndex - b.chunkIndex);

  return chunks.flatMap((chunk) => chunk.companies);
}

export async function deleteAnalysisCompanies(
  periodStart: string,
  periodEnd: string
): Promise<void> {
  const tableName = getTableName();
  const stage = getStage();
  const prefix = buildCompaniesKeyPrefix(periodStart, periodEnd);

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
