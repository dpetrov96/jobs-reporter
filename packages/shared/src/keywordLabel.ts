interface KeywordDisplay {
  emoji: string;
  label: string;
}

const KEYWORD_DISPLAY: Record<string, KeywordDisplay> = {
  "python developer": { emoji: "🐍", label: "Python" },
  "node.js developer": { emoji: "🟢", label: "Node.js" },
  "fullstack developer": { emoji: "🧩", label: "Fullstack" },
  "front-end developer": { emoji: "🎨", label: "Front-end" },
  "ai engineer": { emoji: "🤖", label: "AI engineer" },
  ai: { emoji: "✨", label: "AI" },
  "react native": { emoji: "⚛️", label: "React Native" },
};

function normalizeKeyword(keyword: string): string {
  return keyword.trim().toLowerCase();
}

export function formatKeywordBadge(keyword: string): string {
  const display = KEYWORD_DISPLAY[normalizeKeyword(keyword)];
  if (!display) return keyword;
  return `${display.emoji} ${display.label}`;
}
