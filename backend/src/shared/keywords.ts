export interface KeywordBadge {
  emoji: string;
  label: string;
}

/** Single source of truth — keep backend JOB_KEYWORDS / constants in sync. */
export const JOB_KEYWORD_BADGES: Record<string, KeywordBadge> = {
  "python developer": { emoji: "🐍", label: "Python" },
  "node.js developer": { emoji: "🟢", label: "Node.js" },
  "fullstack developer": { emoji: "🧩", label: "Fullstack" },
  "front-end developer": { emoji: "🎨", label: "Front-end" },
  "ai engineer": { emoji: "🤖", label: "AI engineer" },
  "react native": { emoji: "⚛️", label: "React Native" },
};

export const DEFAULT_JOB_KEYWORD_LIST = Object.keys(JOB_KEYWORD_BADGES);

export const DEFAULT_JOB_KEYWORDS_CSV = DEFAULT_JOB_KEYWORD_LIST.join(",");

function normalizeKeyword(keyword: string): string {
  return keyword.trim().toLowerCase();
}

export function formatKeywordBadge(keyword: string): string {
  const display = JOB_KEYWORD_BADGES[normalizeKeyword(keyword)];
  if (!display) return keyword;
  return `${display.emoji} ${display.label}`;
}

export function formatKeywordLabel(keyword: string): string {
  return formatKeywordBadge(keyword);
}
