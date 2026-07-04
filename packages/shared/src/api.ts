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
  const { limit = 20, cursor } = options;
  const url = new URL("/runs", baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`);
  url.searchParams.set("limit", String(limit));
  if (cursor) url.searchParams.set("cursor", cursor);
  const response = await fetch(url.toString());
  return parseJson<ListRunsResponse>(response);
}

export async function fetchRun(baseUrl: string, fetchedAt: string): Promise<GetRunResponse> {
  const encoded = encodeURIComponent(fetchedAt);
  const url = new URL(`/runs/${encoded}`, baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`);
  const response = await fetch(url.toString());
  return parseJson<GetRunResponse>(response);
}

function triggerUrl(baseUrl: string): URL {
  return new URL("/runs/trigger", baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`);
}

export async function getTriggerFetchStatus(
  baseUrl: string
): Promise<TriggerFetchStatusResponse> {
  const response = await fetch(triggerUrl(baseUrl).toString());
  return parseJson<TriggerFetchStatusResponse>(response);
}

export async function triggerFetch(baseUrl: string): Promise<TriggerFetchResponse> {
  const response = await fetch(triggerUrl(baseUrl).toString(), { method: "POST" });
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

export * from "./types.js";
