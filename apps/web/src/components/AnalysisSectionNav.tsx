import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { encodeAnalysisId } from "@jobs-reporter/shared";
import type { CountryAnalysisResult } from "@jobs-reporter/shared";
import { CountryFlag } from "./CountryFlag";

export type AnalysisNavItem = {
  id: string;
  label: string;
  icon?: string;
  href?: string;
};

type NavGroup = {
  id: string;
  label: string;
  items: AnalysisNavItem[];
};

function scrollToSection(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

export function buildAnalysisNavGroups(
  countries: CountryAnalysisResult[],
  hasAi: boolean,
  analysisId?: string
): NavGroup[] {
  const companiesHref = analysisId
    ? `/analyses/${encodeAnalysisId(analysisId)}/companies`
    : undefined;

  const groups: NavGroup[] = [
    {
      id: "summary",
      label: "Summary",
      items: [
        { id: "overview", label: "Overview", icon: "📊" },
        {
          id: "overview-companies",
          label: "Companies",
          icon: "🏢",
          href: companiesHref,
        },
      ],
    },
  ];

  if (hasAi) {
    groups.push({
      id: "ai",
      label: "AI",
      items: [
        { id: "ai-guide", label: "Guide", icon: "🤖" },
        { id: "ai-technologies", label: "Tech", icon: "⚡" },
        { id: "ai-projects", label: "Projects", icon: "🛠" },
        { id: "ai-interview", label: "Interview", icon: "🎯" },
      ],
    });
  }

  groups.push({
    id: "countries",
    label: "Markets",
    items: [
      { id: "countries", label: "All", icon: "🌍" },
      ...countries.map((country) => ({
        id: `country-${country.code}`,
        label: country.location,
        icon: country.flag,
      })),
    ],
  });

  return groups;
}

export function AnalysisSectionNav({
  countries,
  hasAi,
  analysisId,
}: {
  countries: CountryAnalysisResult[];
  hasAi: boolean;
  analysisId?: string;
}) {
  const groups = useMemo(
    () => buildAnalysisNavGroups(countries, hasAi, analysisId),
    [countries, hasAi, analysisId]
  );

  const scrollItems = useMemo(
    () =>
      groups.flatMap((group) => group.items.filter((item) => !item.href)),
    [groups]
  );
  const sectionIds = useMemo(() => scrollItems.map((item) => item.id), [scrollItems]);

  const [activeId, setActiveId] = useState("overview");

  useEffect(() => {
    const elements = sectionIds
      .map((id) => document.getElementById(id))
      .filter((element): element is HTMLElement => element != null);

    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);

        if (visible[0]?.target.id) {
          setActiveId(visible[0].target.id);
        }
      },
      { rootMargin: "-12% 0px -65% 0px", threshold: [0, 0.1, 0.25] }
    );

    for (const element of elements) {
      observer.observe(element);
    }

    return () => observer.disconnect();
  }, [sectionIds]);

  return (
    <nav
      aria-label="Jump to section"
      className="sticky top-0 z-30 -mx-4 border-b border-zinc-200/80 bg-white/95 px-4 py-2.5 backdrop-blur sm:-mx-8 sm:px-8"
    >
      <div className="flex gap-3 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {groups.map((group) => (
          <div key={group.id} className="flex shrink-0 items-center gap-1">
            <span className="pr-1 text-[9px] font-bold uppercase tracking-widest text-zinc-400">
              {group.label}
            </span>
            {group.items.map((item) => {
              const country =
                group.id === "countries" && item.id.startsWith("country-")
                  ? countries.find((entry) => `country-${entry.code}` === item.id)
                  : undefined;
              const isActive = activeId === item.id;

              const className = `inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium transition ${
                isActive
                  ? "bg-zinc-900 text-white shadow-sm"
                  : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 hover:text-zinc-900"
              }`;

              const content = (
                <>
                  {country ? (
                    <CountryFlag
                      code={country.code}
                      location={country.location}
                      flag={country.flag}
                      size="sm"
                    />
                  ) : item.icon ? (
                    <span className="text-[10px]" aria-hidden>
                      {item.icon}
                    </span>
                  ) : null}
                  <span className="whitespace-nowrap">{item.label}</span>
                </>
              );

              if (item.href) {
                return (
                  <Link key={item.id} to={item.href} className={className}>
                    {content}
                  </Link>
                );
              }

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => scrollToSection(item.id)}
                  className={className}
                >
                  {content}
                </button>
              );
            })}
            <span className="mx-1 h-4 w-px shrink-0 bg-zinc-200 last:hidden" aria-hidden />
          </div>
        ))}
      </div>
    </nav>
  );
}

export function sectionSlugFromTitle(title: string): string {
  if (/in-demand technologies/i.test(title)) return "ai-technologies";
  if (/portfolio projects/i.test(title)) return "ai-projects";
  if (/interview preparation/i.test(title)) return "ai-interview";
  return `ai-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`;
}
