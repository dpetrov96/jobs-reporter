import { Link, useLocation } from "react-router-dom";

const navLinkClass = (active: boolean) =>
  active
    ? "font-medium text-zinc-900"
    : "text-zinc-500 transition hover:text-zinc-800";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();
  const onHome = pathname === "/";
  const onHistory = pathname.startsWith("/history") || pathname.startsWith("/runs/");
  const onAnalyses = pathname.startsWith("/analyses");

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <div className="flex-1">{children}</div>
      <footer className="border-t border-zinc-200 py-4 sm:py-5">
        <nav
          className="mx-auto flex max-w-3xl items-center justify-center gap-6 px-3 text-sm sm:max-w-4xl sm:px-6"
          aria-label="Site"
        >
          <Link to="/" className={navLinkClass(onHome && !onHistory && !onAnalyses)}>
            Latest report
          </Link>
          <span className="text-zinc-300" aria-hidden>
            ·
          </span>
          <Link to="/history" className={navLinkClass(onHistory)}>
            Previous runs
          </Link>
          <span className="text-zinc-300" aria-hidden>
            ·
          </span>
          <Link to="/analyses" className={navLinkClass(onAnalyses)}>
            Analyses
          </Link>
        </nav>
      </footer>
    </div>
  );
}
