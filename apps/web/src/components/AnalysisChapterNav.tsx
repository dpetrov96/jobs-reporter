import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { encodeAnalysisId } from "@jobs-reporter/shared";
import type { CountryAnalysisResult } from "@jobs-reporter/shared";
import { CountryFlag } from "./CountryFlag";
import { scrollToSection } from "./AnalysisPresentationIntro";

type NavItem = {
  id: string;
  label: string;
  href?: string;
  icon?: string;
};

function buildNavItems(hasAi: boolean, analysisId?: string): NavItem[] {
  const companiesHref = analysisId
    ? `/analyses/${encodeAnalysisId(analysisId)}/companies`
    : undefined;

  return [
    { id: "overview", label: "Summary", icon: "📊" },
    ...(hasAi
      ? [
          { id: "ai-guide", label: "AI analysis", icon: "🤖" },
          { id: "ai-technologies", label: "Technologies", icon: "⚡" },
          { id: "ai-projects", label: "Projects", icon: "🛠" },
          { id: "ai-interview", label: "Interview", icon: "🎯" },
        ]
      : []),
    { id: "countries", label: "Markets", icon: "🌍" },
    ...(companiesHref
      ? [{ id: "companies-link", label: "Companies", icon: "🏢", href: companiesHref }]
      : []),
  ];
}

function tabClass(isActive: boolean) {
  return [
    "relative inline-flex shrink-0 cursor-pointer items-center gap-1.5 px-3 py-3 text-sm font-medium transition sm:px-4",
    isActive ? "text-zinc-900" : "text-zinc-500 hover:text-zinc-800",
  ].join(" ");
}

function TabUnderline({ active }: { active: boolean }) {
  if (!active) return null;
  return (
    <span className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-[#0a66c2] sm:inset-x-4" />
  );
}

function NavTab({
  item,
  isActive,
  onNavigate,
}: {
  item: NavItem;
  isActive: boolean;
  onNavigate: () => void;
}) {
  const content = (
    <>
      {item.icon ? (
        <span className="text-sm leading-none" aria-hidden>
          {item.icon}
        </span>
      ) : null}
      <span className="whitespace-nowrap">{item.label}</span>
      <TabUnderline active={isActive} />
    </>
  );

  if (item.href) {
    return (
      <Link to={item.href} className={tabClass(isActive)}>
        {content}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onNavigate} className={tabClass(isActive)}>
      {content}
    </button>
  );
}

export function AnalysisChapterNav({
  countries,
  hasAi,
  analysisId,
}: {
  countries: CountryAnalysisResult[];
  hasAi: boolean;
  analysisId?: string;
}) {
  const items = useMemo(
    () => buildNavItems(hasAi, analysisId),
    [hasAi, analysisId]
  );

  const scrollIds = useMemo(
    () => [
      "overview",
      ...(hasAi ? ["ai-guide", "ai-technologies", "ai-projects", "ai-interview"] : []),
      "countries",
      ...countries.map((c) => `country-${c.code}`),
    ],
    [countries, hasAi]
  );

  const [activeId, setActiveId] = useState("overview");
  const [showCountries, setShowCountries] = useState(false);

  useEffect(() => {
    if (activeId === "countries" || activeId.startsWith("country-")) {
      setShowCountries(true);
    } else if (
      activeId === "overview" ||
      activeId === "ai-guide" ||
      activeId.startsWith("ai-")
    ) {
      setShowCountries(false);
    }
  }, [activeId]);

  useEffect(() => {
    const elements = scrollIds
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
      { rootMargin: "-12% 0px -68% 0px", threshold: [0, 0.1, 0.25] }
    );

    for (const element of elements) {
      observer.observe(element);
    }

    return () => observer.disconnect();
  }, [scrollIds]);

  function isItemActive(item: NavItem): boolean {
    if (item.id === "companies-link") return false;
    if (item.id === "countries") {
      return activeId === "countries" || activeId.startsWith("country-");
    }
    return activeId === item.id;
  }

  return (
    <nav
      aria-label="Report sections"
      className="sticky top-0 z-30 -mx-3 border-b border-zinc-200 bg-white/95 backdrop-blur-md sm:-mx-8"
    >
      <div className="flex overflow-x-auto px-1 sm:px-4 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {items.map((item) => (
          <NavTab
            key={item.id}
            item={item}
            isActive={isItemActive(item)}
            onNavigate={() => {
              if (item.id === "countries") setShowCountries(true);
              scrollToSection(item.id);
            }}
          />
        ))}
      </div>

      {showCountries && countries.length > 0 ? (
        <div className="flex overflow-x-auto border-t border-zinc-100 px-1 sm:px-4 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {countries.map((country) => {
            const id = `country-${country.code}`;
            const isActive = activeId === id;

            return (
              <button
                key={country.code}
                type="button"
                onClick={() => scrollToSection(id)}
                className={tabClass(isActive)}
              >
                <CountryFlag
                  code={country.code}
                  location={country.location}
                  flag={country.flag}
                  size="sm"
                />
                <span className="whitespace-nowrap">{country.location}</span>
                <TabUnderline active={isActive} />
              </button>
            );
          })}
        </div>
      ) : null}
    </nav>
  );
}

export function sectionSlugFromTitle(title: string): string {
  if (/in-demand technologies/i.test(title)) return "ai-technologies";
  if (/portfolio projects/i.test(title)) return "ai-projects";
  if (/interview preparation/i.test(title)) return "ai-interview";
  return `ai-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`;
}
