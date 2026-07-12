import { Link, useLocation } from "react-router-dom";

type NavItem = {
  to: string;
  label: string;
  shortLabel: string;
  isActive: boolean;
  icon: React.ReactNode;
};

function NavIcon({ children }: { children: React.ReactNode }) {
  return (
    <span className="flex h-6 w-6 items-center justify-center" aria-hidden>
      {children}
    </span>
  );
}

const icons = {
  latest: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="h-5 w-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 19h16M6 16l3-8 3 4 2-3 4 7" />
    </svg>
  ),
  history: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="h-5 w-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l2.5 2.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" />
    </svg>
  ),
  analyses: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="h-5 w-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 19V5m0 14h16M8 15v-4m4 4V9m4 6V7" />
    </svg>
  ),
  companies: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="h-5 w-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 21h18M6 21V7l6-4 6 4v14M10 10h4M10 14h4" />
    </svg>
  ),
};

function SiteNavLink({ item }: { item: NavItem }) {
  return (
    <Link
      to={item.to}
      className={`flex min-h-[52px] cursor-pointer flex-col items-center justify-center gap-1 rounded-2xl px-3 py-2 text-center transition active:scale-[0.98] ${
        item.isActive
          ? "bg-white text-zinc-900 shadow-sm ring-1 ring-zinc-200/80"
          : "text-zinc-500 hover:bg-white/70 hover:text-zinc-800"
      }`}
    >
      <NavIcon>{item.icon}</NavIcon>
      <span className="text-[11px] font-medium leading-none sm:text-xs">{item.label}</span>
    </Link>
  );
}

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();
  const onHome = pathname === "/";
  const onHistory = pathname.startsWith("/history") || pathname.startsWith("/runs/");
  const onAnalyses =
    pathname.startsWith("/analyses") && !pathname.includes("/companies");
  const onCompanies = pathname === "/companies" || pathname.includes("/companies");

  const items: NavItem[] = [
    {
      to: "/",
      label: "Latest report",
      shortLabel: "Latest",
      isActive: onHome && !onHistory && !onAnalyses && !onCompanies,
      icon: icons.latest,
    },
    {
      to: "/history",
      label: "Previous runs",
      shortLabel: "History",
      isActive: onHistory,
      icon: icons.history,
    },
    {
      to: "/analyses",
      label: "Analyses",
      shortLabel: "Analyses",
      isActive: onAnalyses,
      icon: icons.analyses,
    },
    {
      to: "/companies",
      label: "Companies",
      shortLabel: "Companies",
      isActive: onCompanies,
      icon: icons.companies,
    },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <div className="flex-1">{children}</div>
      <footer className="border-t border-zinc-200/80 bg-zinc-50/90 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-lg">
        <nav
          className="mx-auto grid max-w-2xl grid-cols-4 gap-1.5 px-2 sm:max-w-3xl sm:gap-2 sm:px-4"
          aria-label="Site"
        >
          {items.map((item) => (
            <SiteNavLink key={item.to} item={item} />
          ))}
        </nav>
      </footer>
    </div>
  );
}
