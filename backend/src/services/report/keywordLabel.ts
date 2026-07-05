/** Keep in sync with packages/shared/src/keywords.ts */
interface KeywordBadge {
  emoji: string;
  label: string;
}

const JOB_KEYWORD_BADGES: Record<string, KeywordBadge> = {
  "python developer": { emoji: "🐍", label: "Python" },
  "node.js developer": { emoji: "🟢", label: "Node.js" },
  "fullstack developer": { emoji: "🧩", label: "Fullstack" },
  "front-end developer": { emoji: "🎨", label: "Front-end" },
  "ai engineer": { emoji: "🤖", label: "AI engineer" },
  "react native": { emoji: "⚛️", label: "React Native" },
};

function normalizeKeyword(keyword: string): string {
  return keyword.trim().toLowerCase();
}

export function formatKeywordBadge(keyword: string): string {
  const display = JOB_KEYWORD_BADGES[normalizeKeyword(keyword)];
  if (!display) return keyword;
  return `${display.emoji} ${display.label}`;
}
