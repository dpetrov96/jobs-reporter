import type { Components } from "react-markdown";
import ReactMarkdown from "react-markdown";
import { AnalysisSlideHeader } from "./AnalysisSlideHeader";
import { sectionSlugFromTitle } from "./AnalysisChapterNav";

interface MarkdownSection {
  title: string;
  body: string;
}

const SECTION_THEMES: Array<{
  match: RegExp;
  icon: string;
  accent: string;
}> = [
  {
    match: /in-demand technologies/i,
    icon: "⚡",
    accent: "border-l-blue-500",
  },
  {
    match: /portfolio projects/i,
    icon: "🛠",
    accent: "border-l-emerald-500",
  },
  {
    match: /interview preparation/i,
    icon: "🎯",
    accent: "border-l-amber-500",
  },
];

const DEFAULT_THEME = {
  icon: "✦",
  accent: "border-l-violet-500",
};

function parseMarkdownSections(content: string): MarkdownSection[] {
  const trimmed = content.trim();
  if (!trimmed) return [];

  const parts = trimmed.split(/^## /m);
  if (parts.length === 1) {
    return [{ title: "AI insights", body: trimmed }];
  }

  return parts
    .filter(Boolean)
    .map((part) => {
      const newline = part.indexOf("\n");
      if (newline === -1) {
        return { title: part.trim(), body: "" };
      }

      return {
        title: part.slice(0, newline).trim(),
        body: part.slice(newline + 1).trim(),
      };
    });
}

function getSectionTheme(title: string) {
  return SECTION_THEMES.find((theme) => theme.match.test(title)) ?? DEFAULT_THEME;
}

const sectionMarkdownComponents: Components = {
  h3: ({ children }) => (
    <h4 className="mt-4 text-sm font-semibold text-zinc-800 first:mt-0">{children}</h4>
  ),
  h4: ({ children }) => (
    <h5 className="mt-3 text-sm font-medium text-zinc-800">{children}</h5>
  ),
  p: ({ children }) => (
    <p className="mt-2 text-sm leading-relaxed text-zinc-700">{children}</p>
  ),
  ul: ({ children }) => (
    <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm text-zinc-700">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="mt-2 list-decimal space-y-2 pl-5 text-sm text-zinc-700">{children}</ol>
  ),
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
  strong: ({ children }) => (
    <strong className="font-semibold text-zinc-900">{children}</strong>
  ),
};

function AiSectionCard({ title, body }: MarkdownSection) {
  const theme = getSectionTheme(title);
  const sectionId = sectionSlugFromTitle(title);

  return (
    <article
      id={sectionId}
      className={`scroll-mt-28 border-l-4 ${theme.accent} py-1 pl-5 sm:pl-6`}
    >
      <div className="flex items-start gap-3">
        <span className="text-lg" aria-hidden>
          {theme.icon}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-semibold text-zinc-900">{title}</h3>
          {body ? (
            <div className="mt-3 max-w-none">
              <ReactMarkdown components={sectionMarkdownComponents}>{body}</ReactMarkdown>
            </div>
          ) : null}
        </div>
      </div>
    </article>
  );
}

export function AiAnalysisReport({ content }: { content: string }) {
  const sections = parseMarkdownSections(content);

  return (
    <section id="ai-guide" className="scroll-mt-28 space-y-8">
      <AnalysisSlideHeader
        kicker="AI career guide"
        title="Senior fullstack market insights"
        subtitle="Technologies, portfolio projects & interview prep from real job descriptions"
        tone="violet"
        icon="🤖"
      />

      <div className="space-y-10">
        {sections.map((section) => (
          <AiSectionCard key={section.title} title={section.title} body={section.body} />
        ))}
      </div>
    </section>
  );
}
