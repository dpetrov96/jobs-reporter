import { fetchLinkedInHtml } from "../linkedin/fetch.js";
import {
  buildLinkedInJobDetailUrl,
  parseJobDescriptionFromDetailHtml,
} from "../linkedin/parser.js";
import { formatKeywordLabel } from "../../shared/keywords.js";

const REQUEST_DELAY_MS = 250;
const CONCURRENCY = 3;
const MAX_DESCRIPTION_CHARS = 1_200;

export interface AiJobSample {
  id: string;
  title: string;
  company: string;
  keyword: string;
  countryCode: string;
  countryLabel: string;
}

export interface JobDescriptionContext {
  sample: AiJobSample;
  description: string;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function truncateDescription(text: string, maxChars = MAX_DESCRIPTION_CHARS): string {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxChars) return normalized;
  return `${normalized.slice(0, maxChars).trim()}…`;
}

export async function fetchJobDescriptionsForSamples(
  samples: AiJobSample[],
  options: {
    maxSamples?: number;
    onProgress?: (message: string) => void | Promise<void>;
  } = {}
): Promise<JobDescriptionContext[]> {
  const maxSamples = options.maxSamples ?? 30;
  const selected = samples.slice(0, maxSamples);
  const results: JobDescriptionContext[] = [];

  for (let index = 0; index < selected.length; index += CONCURRENCY) {
    const batch = selected.slice(index, index + CONCURRENCY);

    await options.onProgress?.(
      `Четене на job descriptions… ${Math.min(index + batch.length, selected.length)}/${selected.length}`
    );

    const batchResults = await Promise.all(
      batch.map(async (sample) => {
        try {
          const html = await fetchLinkedInHtml(buildLinkedInJobDetailUrl(sample.id));
          const description = parseJobDescriptionFromDetailHtml(html);
          if (!description) return null;

          return {
            sample,
            description: truncateDescription(description),
          };
        } catch {
          return null;
        }
      })
    );

    for (const item of batchResults) {
      if (item) results.push(item);
    }

    if (index + CONCURRENCY < selected.length) {
      await sleep(REQUEST_DELAY_MS);
    }
  }

  return results;
}

export function buildDescriptionPromptSection(contexts: JobDescriptionContext[]): string {
  if (contexts.length === 0) {
    return "No LinkedIn job descriptions available for this period.";
  }

  const lines: string[] = [
    "## Job descriptions for top roles (all countries)",
    "Use these to infer specific technologies, tools, and interview topics — not just keyword stats.",
  ];

  const byKeyword = new Map<string, JobDescriptionContext[]>();
  for (const context of contexts) {
    const group = byKeyword.get(context.sample.keyword) ?? [];
    group.push(context);
    byKeyword.set(context.sample.keyword, group);
  }

  for (const [keyword, keywordItems] of byKeyword) {
    lines.push(`\n### ${formatKeywordLabel(keyword)}`);
    for (const [index, item] of keywordItems.entries()) {
      lines.push(
        `Listing ${index + 1} (${item.sample.countryLabel}): ${item.sample.title} @ ${item.sample.company}`,
        item.description,
        ""
      );
    }
  }

  return lines.join("\n");
}
