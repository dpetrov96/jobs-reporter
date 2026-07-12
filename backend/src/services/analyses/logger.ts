export type AnalysisLogPhase =
  | "start"
  | "guard"
  | "load_runs"
  | "compute"
  | "ai_check"
  | "ai_request"
  | "ai_done"
  | "save"
  | "complete"
  | "failed";

export interface AnalysisLogContext {
  analysisId?: string;
  periodStart?: string;
  periodEnd?: string;
  phase: AnalysisLogPhase;
  message: string;
  elapsedMs?: number;
  runCount?: number;
  totalJobs?: number;
  uniqueJobs?: number;
  countryCount?: number;
  page?: number;
  pageRuns?: number;
  aiEnabled?: boolean;
  aiKeyConfigured?: boolean;
  aiModel?: string;
  aiSkipped?: boolean;
  error?: string;
}

const startedAt = Date.now();

export function analysisLog(context: AnalysisLogContext): void {
  const entry = {
    service: "analysis",
    timestamp: new Date().toISOString(),
    elapsedMs: context.elapsedMs ?? Date.now() - startedAt,
    ...context,
  };

  if (context.phase === "failed" || context.error) {
    console.error(JSON.stringify(entry));
    return;
  }

  console.log(JSON.stringify(entry));
}

export function maskSecret(value: string | undefined): string {
  if (!value?.trim()) return "(missing)";
  const trimmed = value.trim();
  if (trimmed.length <= 8) return "****";
  return `${trimmed.slice(0, 7)}…${trimmed.slice(-4)} (${trimmed.length} chars)`;
}

export function getAiConfig(): {
  keyConfigured: boolean;
  enabled: boolean;
  model: string;
  keyPreview: string;
} {
  const apiKey = process.env.OPENAI_API_KEY?.trim() ?? "";
  const model = process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";

  return {
    keyConfigured: apiKey.length > 0,
    enabled: apiKey.length > 0,
    model,
    keyPreview: maskSecret(apiKey),
  };
}
