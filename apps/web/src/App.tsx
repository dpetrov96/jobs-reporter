import { Link, Route, Routes } from "react-router-dom";
import { DEFAULT_API_URL } from "@jobs-reporter/shared";
import { RunDetailPage } from "./pages/RunDetailPage";
import { RunListPage } from "./pages/RunListPage";
import { useTheme } from "./hooks/useTheme";

const API_URL = import.meta.env.VITE_API_URL ?? DEFAULT_API_URL;

export default function App() {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <header className="sticky top-0 z-20 border-b border-zinc-200/80 bg-white/80 backdrop-blur-md dark:border-zinc-800/80 dark:bg-zinc-950/80">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div>
            <Link
              to="/"
              className="text-xl font-bold tracking-tight text-zinc-900 transition hover:text-emerald-600 dark:text-zinc-50 dark:hover:text-emerald-400"
            >
              Jobs Reporter
            </Link>
            <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
              LinkedIn jobs · multi-country · hourly
            </p>
          </div>
          <button
            type="button"
            onClick={toggleTheme}
            className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-700 shadow-sm transition hover:border-emerald-300 hover:text-emerald-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:border-emerald-700 dark:hover:text-emerald-300"
          >
            {theme === "dark" ? "☀️ Light" : "🌙 Dark"}
          </button>
        </div>
      </header>

      <Routes>
        <Route path="/" element={<RunListPage apiUrl={API_URL} />} />
        <Route path="/runs/:fetchedAt" element={<RunDetailPage apiUrl={API_URL} />} />
      </Routes>
    </div>
  );
}
