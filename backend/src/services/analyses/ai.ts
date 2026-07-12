import { buildDescriptionPromptSection, type JobDescriptionContext } from "./descriptions.js";
import { summarizeForAi, type ComputedAnalysis } from "./compute.js";
import { analysisLog, getAiConfig } from "./logger.js";

const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";

const SYSTEM_PROMPT =
  "You are a mentor for senior software engineers. You analyze the EU job market (all countries combined) " +
  "using aggregate stats AND real LinkedIn job descriptions provided in the user message. " +
  "Respond in English with markdown. Do NOT write separate sections per country.\n\n" +
  "Reader profile (always keep in mind):\n" +
  "- Senior fullstack engineer with 11+ years of industry experience\n" +
  "- Strong in Python and Node.js, knows React, databases, cloud, CI/CD\n" +
  "- Do NOT recommend basics (syntax, CRUD tutorials, \"learn Python/JS\")\n" +
  "- Every claim must be grounded in the supplied stats and/or job descriptions — do not invent tech not seen in the data\n\n" +
  "Use EXACTLY these sections in this order:\n\n" +
  "## Most in-demand technologies (senior perspective)\n" +
  "Identify the top technologies, tools, frameworks, and platforms employers actually mention in the postings. " +
  "Go beyond keyword lists — infer stacks from descriptions (e.g. not just \"Python\" but FastAPI, Celery, " +
  "Pydantic, async patterns, observability, specific cloud services, vector DBs, LLM tooling if present).\n" +
  "For each of the top 8–12 items provide:\n" +
  "- **Why it matters now** for a senior hire in this market\n" +
  "- **How employers phrase it** — paraphrase recurring requirements from descriptions\n" +
  "- **Senior-level depth** — what to know beyond the buzzword (architecture, trade-offs, production concerns)\n" +
  "- **Frequency signal** — tie to stats/descriptions when possible\n" +
  "Split into **Must-have now** and **Emerging (6–12 months)** subsections.\n\n" +
  "## Example portfolio projects to build\n" +
  "Propose 3–4 senior-level portfolio or side projects that directly exercise the technologies above.\n" +
  "For each project include:\n" +
  "- **Name & business problem**\n" +
  "- **Architecture** (components, data flow, scale considerations)\n" +
  "- **Tech stack** — specific libraries/services seen in the job descriptions, not generic defaults\n" +
  "- **AI/ML angle** (if relevant to the postings)\n" +
  "- **What it proves in an interview** — which senior competencies it demonstrates\n" +
  "No toy apps; production-minded scope only.\n\n" +
  "## Interview preparation guide\n" +
  "Detailed preparation for interviewing in THIS market, based on what the descriptions actually ask for.\n" +
  "Cover the **top 5–7 technologies** from your analysis with a dedicated subsection each. Per technology:\n" +
  "- **What interviewers probe** — derived from how employers write requirements in the descriptions\n" +
  "- **System design angles** — realistic scenarios for a senior fullstack/AI role\n" +
  "- **Hands-on topics to rehearse** — specific APIs, patterns, failure modes, ops concerns (not \"know Python\")\n" +
  "- **3–5 example senior-level questions** you should be able to answer cold\n" +
  "- **Gap check** — what an 11+ year generalist might be rusty on for this tech in 2026\n" +
  "End with a **Day-before-interview checklist** (10–15 bullets) tailored to the most common themes in the postings.\n\n" +
  "Rules:\n" +
  "- Be specific and actionable; avoid vague advice\n" +
  "- Quote or paraphrase description patterns to justify recommendations\n" +
  "- Do NOT add extra top-level sections beyond the three above\n" +
  "- Do NOT give per-country breakdowns";

export interface AiRecommendationResult {
  recommendations?: string;
  skipped: boolean;
  skipReason?: string;
}

export interface AiOptions {
  analysisId?: string;
  descriptionContexts?: JobDescriptionContext[];
}

export async function generateAiRecommendations(
  result: ComputedAnalysis,
  options: AiOptions = {}
): Promise<AiRecommendationResult> {
  const { analysisId, descriptionContexts = [] } = options;
  const aiConfig = getAiConfig();

  analysisLog({
    analysisId,
    phase: "ai_check",
    message: `Checking AI: enabled=${aiConfig.enabled}, key=${aiConfig.keyPreview}, descriptions=${descriptionContexts.length}`,
    aiKeyConfigured: aiConfig.keyConfigured,
    aiEnabled: aiConfig.enabled,
    aiModel: aiConfig.model,
    countryCount: result.countries.length,
    uniqueJobs: result.uniqueJobs,
  });

  if (!aiConfig.keyConfigured) {
    analysisLog({
      analysisId,
      phase: "ai_done",
      message: "AI disabled — OPENAI_API_KEY missing",
      aiSkipped: true,
      aiKeyConfigured: false,
      aiEnabled: false,
    });

    return {
      skipped: true,
      skipReason: "OPENAI_API_KEY not configured",
    };
  }

  const model = aiConfig.model;
  const statsSummary = summarizeForAi(result);
  const descriptionsSummary = buildDescriptionPromptSection(descriptionContexts);
  const userPrompt = [
    "Create a senior engineer career guide for the EU market using the stats and job descriptions below.",
    "The reader is a senior fullstack engineer (11+ years, Python + Node.js) preparing for interviews and upskilling.",
    "",
    "Requirements:",
    "- Extract technologies from descriptions — be granular (frameworks, cloud services, patterns), not just language names",
    "- Interview prep must reference actual requirements language from the postings",
    "- Projects must use stacks that appear in the descriptions",
    "- Write in English; one global answer (not per country)",
    "",
    statsSummary,
    "",
    descriptionsSummary,
  ].join("\n");

  analysisLog({
    analysisId,
    phase: "ai_request",
    message: `Calling OpenAI model=${model}, promptChars=${userPrompt.length}, descriptions=${descriptionContexts.length}`,
    aiModel: model,
    aiEnabled: true,
    aiKeyConfigured: true,
  });

  const requestStarted = Date.now();

  const response = await fetch(OPENAI_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY!.trim()}`,
    },
    body: JSON.stringify({
      model,
      max_tokens: 4096,
      temperature: 0.35,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
    }),
  });

  const requestMs = Date.now() - requestStarted;

  if (!response.ok) {
    const errorText = await response.text();

    analysisLog({
      analysisId,
      phase: "ai_done",
      message: `OpenAI HTTP ${response.status}`,
      aiSkipped: true,
      error: errorText.slice(0, 200),
      elapsedMs: requestMs,
    });

    return {
      skipped: true,
      skipReason: `OpenAI API error (${response.status}): ${errorText.slice(0, 200)}`,
    };
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
    usage?: { total_tokens?: number };
  };

  const content = data.choices?.[0]?.message?.content?.trim();

  if (!content) {
    analysisLog({
      analysisId,
      phase: "ai_done",
      message: "OpenAI returned empty content",
      aiSkipped: true,
      elapsedMs: requestMs,
    });

    return {
      skipped: true,
      skipReason: "OpenAI returned empty response",
    };
  }

  analysisLog({
    analysisId,
    phase: "ai_done",
    message: `OpenAI success: ${content.length} chars, tokens=${data.usage?.total_tokens ?? "?"}`,
    aiSkipped: false,
    elapsedMs: requestMs,
  });

  return {
    recommendations: content,
    skipped: false,
  };
}
