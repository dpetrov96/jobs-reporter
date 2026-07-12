import { analysisLog, getAiConfig } from "./logger.js";
import { normalizeCompanyDomain } from "./companies.js";

const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";
export const DOMAIN_LOOKUP_BATCH_SIZE = 5;

const SYSTEM_PROMPT =
  "You find official company website domains for employers listed in job market data. " +
  "Return ONLY valid JSON: an object whose keys are the exact company names provided and values are " +
  "the primary corporate website hostname (e.g. \"stripe.com\"), without protocol or path. " +
  "Use null when you cannot confidently identify the official website. " +
  "Prefer the main corporate domain, not LinkedIn, Glassdoor, or job board URLs.";

export interface CompanyDomainLookup {
  name: string;
  domain?: string;
  status: "found" | "not_found";
}

function normalizeCompanyKey(name: string): string {
  return name.trim().toLowerCase();
}

export async function resolveCompanyDomainsBatch(
  companyNames: string[],
  options: { analysisId?: string } = {}
): Promise<CompanyDomainLookup[]> {
  const { analysisId } = options;
  const aiConfig = getAiConfig();

  if (!aiConfig.keyConfigured) {
    throw new Error("OPENAI_API_KEY not configured");
  }

  if (companyNames.length === 0) {
    return [];
  }

  analysisLog({
    analysisId,
    phase: "domain_ai_request",
    message: `Resolving domains for ${companyNames.length} companies`,
    aiModel: aiConfig.model,
  });

  const userPrompt = [
    "Find the official website domain for each company below.",
    "Return JSON only. Keys must match the company names exactly.",
    "",
    JSON.stringify(companyNames, null, 2),
  ].join("\n");

  const response = await fetch(OPENAI_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY!.trim()}`,
    },
    body: JSON.stringify({
      model: aiConfig.model,
      max_tokens: 1024,
      temperature: 0.1,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI API error (${response.status}): ${errorText.slice(0, 200)}`);
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) {
    throw new Error("OpenAI returned empty domain response");
  }

  let parsed: Record<string, string | null>;
  try {
    parsed = JSON.parse(content) as Record<string, string | null>;
  } catch {
    throw new Error("OpenAI returned invalid JSON for domains");
  }

  const lookup = new Map(companyNames.map((name) => [normalizeCompanyKey(name), name]));
  const resolvedByKey = new Map<string, string>();

  for (const [rawName, rawDomain] of Object.entries(parsed)) {
    if (rawDomain == null || rawDomain === "null") continue;

    const domain = normalizeCompanyDomain(String(rawDomain));
    if (!domain) continue;

    const exactName = lookup.get(normalizeCompanyKey(rawName)) ?? rawName;
    resolvedByKey.set(normalizeCompanyKey(exactName), domain);
  }

  const results: CompanyDomainLookup[] = companyNames.map((name) => {
    const domain = resolvedByKey.get(normalizeCompanyKey(name));
    return domain
      ? { name, domain, status: "found" as const }
      : { name, status: "not_found" as const };
  });

  analysisLog({
    analysisId,
    phase: "domain_ai_done",
    message: `Resolved ${results.filter((entry) => entry.status === "found").length}/${companyNames.length} domains`,
  });

  return results;
}

/** @deprecated Use resolveCompanyDomainsBatch */
export async function resolveCompanyDomains(
  companyNames: string[],
  options: { analysisId?: string } = {}
): Promise<Record<string, string>> {
  const results = await resolveCompanyDomainsBatch(companyNames, options);
  const record: Record<string, string> = {};

  for (const entry of results) {
    if (entry.domain) {
      record[entry.name] = entry.domain;
    }
  }

  return record;
}
