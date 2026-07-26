import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchDaySummary, getScrapeRegion, isJobRunRecord } from "@jobs-reporter/shared";
import type { JobRunRecord } from "@jobs-reporter/shared";
import { DaySectionsReport } from "../components/DaySectionsReport";
import { RegionTabs } from "../components/RegionTabs";
import { useScrapeRegion } from "../hooks/useScrapeRegion";

function LoadingState({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 py-8 text-sm text-zinc-400">
      <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-zinc-300 border-t-transparent" />
      {label}
    </div>
  );
}

export function DayOverviewPage({ apiUrl }: { apiUrl: string }) {
  const { region, setRegion } = useScrapeRegion();
  const [run, setRun] = useState<JobRunRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetchDaySummary(apiUrl, { scrapeRegion: region, day: "today" });
      const nextRun = response.run && isJobRunRecord(response.run) ? response.run : null;
      setRun(nextRun);
      if (!nextRun) {
        setError("No hourly scrapes found for today yet.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load today's summary");
      setRun(null);
    } finally {
      setLoading(false);
    }
  }, [apiUrl, region]);

  useEffect(() => {
    void load();
  }, [load]);

  const regionConfig = getScrapeRegion(region);

  return (
    <main className="mx-auto max-w-3xl px-3 py-3 sm:px-6 sm:py-5 lg:max-w-4xl">
      <header className="mb-4 space-y-3">
        <Link
          to={region === "usa" ? "/?region=usa" : "/"}
          className="inline-block text-xs text-zinc-400 transition hover:text-zinc-600"
        >
          ← Back to latest
        </Link>
        <div>
          <h1 className="text-lg font-semibold text-zinc-900">All for today</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Unique jobs from every scrape today in {regionConfig.label}, grouped by country.
          </p>
        </div>
        <RegionTabs activeRegion={region} onChange={setRegion} />
      </header>

      {loading ? (
        <LoadingState label="Loading today's jobs…" />
      ) : error ? (
        <div className="py-8 text-center text-sm text-red-600">{error}</div>
      ) : run ? (
        <DaySectionsReport run={run} />
      ) : null}
    </main>
  );
}
