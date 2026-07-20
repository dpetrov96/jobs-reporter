import type {
  GetAnalysisResponse,
  ListAnalysesResponse,
  StartAnalysisRequest,
  StartAnalysisResponse,
  EnrichCompanyDomainsResponse,
} from "./analysis.js";
import type {
  FetchRunsOptions,
  GetRunResponse,
  ListRunsResponse,
  TriggerFetchResponse,
  TriggerFetchStatusResponse,
} from "./types.js";

async function parseJson<T>(response: Response): Promise<T> {
  const data = (await response.json()) as T & { error?: string };

  if (!response.ok) {
    const message =
      typeof data === "object" && data && "error" in data && data.error
        ? data.error
        : `Request failed (${response.status})`;
    throw new Error(message);
  }

  return data;
}

export async function fetchRuns(
  baseUrl: string,
  options: FetchRunsOptions = {}
): Promise<ListRunsResponse> {
  const { limit = 20, cursor, scrapeRegion, reportKind } = options;
  const url = new URL("/runs", baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`);
  url.searchParams.set("limit", String(limit));
  if (cursor) url.searchParams.set("cursor", cursor);
  if (scrapeRegion) url.searchParams.set("region", scrapeRegion);
  if (reportKind && reportKind !== "all") {
    url.searchParams.set("kind", reportKind);
  }
  const response = await fetch(url.toString());
  return parseJson<ListRunsResponse>(response);
}

export async function fetchRun(baseUrl: string, fetchedAt: string): Promise<GetRunResponse> {
  const encoded = encodeURIComponent(fetchedAt);
  const url = new URL(`/runs/${encoded}`, baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`);
  const response = await fetch(url.toString());
  return parseJson<GetRunResponse>(response);
}

function triggerUrl(baseUrl: string, scrapeRegion?: "europe" | "usa"): URL {
  const url = new URL("/runs/trigger", baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`);
  if (scrapeRegion && scrapeRegion !== "europe") {
    url.searchParams.set("region", scrapeRegion);
  }
  return url;
}

export async function getTriggerFetchStatus(
  baseUrl: string,
  scrapeRegion: "europe" | "usa" = "europe"
): Promise<TriggerFetchStatusResponse> {
  const response = await fetch(triggerUrl(baseUrl, scrapeRegion).toString());
  return parseJson<TriggerFetchStatusResponse>(response);
}

export async function triggerFetch(
  baseUrl: string,
  scrapeRegion: "europe" | "usa" = "europe"
): Promise<TriggerFetchResponse> {
  const response = await fetch(triggerUrl(baseUrl, scrapeRegion).toString(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ region: scrapeRegion }),
  });
  const data = await response.json() as TriggerFetchResponse & { error?: string };

  if (!response.ok) {
    const message = data.error ?? `Request failed (${response.status})`;
    throw Object.assign(new Error(message), {
      retryAfterSeconds: data.retryAfterSeconds,
      status: response.status,
    });
  }

  return data;
}

export async function fetchAnalyses(
  baseUrl: string,
  options: { limit?: number; cursor?: string } = {}
): Promise<ListAnalysesResponse> {
  const { limit = 20, cursor } = options;
  const url = new URL("/analyses", baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`);
  url.searchParams.set("limit", String(limit));
  if (cursor) url.searchParams.set("cursor", cursor);
  const response = await fetch(url.toString());
  return parseJson<ListAnalysesResponse>(response);
}

export async function fetchAnalysis(
  baseUrl: string,
  analysisId: string
): Promise<GetAnalysisResponse> {
  const encoded = encodeURIComponent(analysisId);
  const url = new URL(`/analyses/${encoded}`, baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`);
  const response = await fetch(url.toString());
  return parseJson<GetAnalysisResponse>(response);
}

export async function cancelAnalysis(
  baseUrl: string,
  analysisId: string
): Promise<GetAnalysisResponse> {
  const encoded = encodeURIComponent(analysisId);
  const url = new URL(`/analyses/${encoded}`, baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`);
  url.searchParams.set("cancel", "true");
  const response = await fetch(url.toString());
  return parseJson<GetAnalysisResponse>(response);
}

export async function reanalyzeAnalysis(
  baseUrl: string,
  analysisId: string
): Promise<StartAnalysisResponse> {
  const encoded = encodeURIComponent(analysisId);
  const url = new URL(`/analyses/${encoded}`, baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`);
  url.searchParams.set("reanalyze", "true");
  const response = await fetch(url.toString());
  const data = (await response.json()) as StartAnalysisResponse & { error?: string };

  if (!response.ok) {
    const message = data.error ?? `Request failed (${response.status})`;
    throw Object.assign(new Error(message), {
      status: response.status,
      analysis: data.analysis,
    });
  }

  return data;
}

export async function startAnalysis(
  baseUrl: string,
  body: StartAnalysisRequest
): Promise<StartAnalysisResponse> {
  const url = new URL("/analyses", baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`);
  const response = await fetch(url.toString(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await response.json()) as StartAnalysisResponse & { error?: string };

  if (!response.ok) {
    const message = data.error ?? `Request failed (${response.status})`;
    throw Object.assign(new Error(message), {
      status: response.status,
      analysis: data.analysis,
    });
  }

  return data;
}

export async function enrichCompanyDomains(
  baseUrl: string,
  analysisId: string,
  options: { countryCode: string }
): Promise<EnrichCompanyDomainsResponse> {
  const encoded = encodeURIComponent(analysisId);
  const url = new URL(
    `/analyses/${encoded}/enrich-domains`,
    baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`
  );
  const response = await fetch(url.toString(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ countryCode: options.countryCode.toUpperCase() }),
  });
  const data = (await response.json()) as EnrichCompanyDomainsResponse & { error?: string };

  if (!response.ok) {
    const message = data.error ?? `Request failed (${response.status})`;
    throw Object.assign(new Error(message), {
      status: response.status,
      analysis: data.analysis,
    });
  }

  return data;
}

export async function cancelDomainEnrichment(
  baseUrl: string,
  analysisId: string
): Promise<EnrichCompanyDomainsResponse> {
  const encoded = encodeURIComponent(analysisId);
  const url = new URL(
    `/analyses/${encoded}/enrich-domains`,
    baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`
  );
  const response = await fetch(url.toString(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "cancel" }),
  });
  const data = (await response.json()) as EnrichCompanyDomainsResponse & { error?: string };

  if (!response.ok) {
    const message = data.error ?? `Request failed (${response.status})`;
    throw Object.assign(new Error(message), {
      status: response.status,
      analysis: data.analysis,
    });
  }

  return data;
}

export * from "./analysis.js";
export * from "./types.js";
