import { summarizeForAi, type ComputedAnalysis } from "./compute.js";

const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";

export interface AiRecommendationResult {
  recommendations?: string;
  skipped: boolean;
  skipReason?: string;
}

export async function generateAiRecommendations(
  result: ComputedAnalysis
): Promise<AiRecommendationResult> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();

  if (!apiKey) {
    return {
      skipped: true,
      skipReason: "OPENAI_API_KEY not configured",
    };
  }

  const summary = summarizeForAi(result);

  const response = await fetch(OPENAI_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini",
      temperature: 0.4,
      messages: [
        {
          role: "system",
          content:
            "You are a career and tech skills advisor for software developers. " +
            "Based on job market data, recommend frameworks and technologies to learn " +
            "so the team does not fall behind market demand. " +
            "Respond in Bulgarian. Use markdown with clear sections per country. " +
            "Be specific, actionable, and prioritize by demand. " +
            "Include: must-learn now, good-to-have, and emerging trends.",
        },
        {
          role: "user",
          content:
            "Analyze this LinkedIn job market data and recommend what technologies " +
            "and frameworks we should learn:\n\n" +
            summary,
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    return {
      skipped: true,
      skipReason: `OpenAI API error (${response.status}): ${errorText.slice(0, 200)}`,
    };
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  const content = data.choices?.[0]?.message?.content?.trim();

  if (!content) {
    return {
      skipped: true,
      skipReason: "OpenAI returned empty response",
    };
  }

  return {
    recommendations: content,
    skipped: false,
  };
}
