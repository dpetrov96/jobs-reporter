import { countUniqueJobs } from "../../shared/jobCounts.js";
import { filterBlockedCompanies, isBlockedCompany } from "../../shared/companyBlocklist.js";
import {
  countryStubs,
  gzipCountries,
  slimDailyCountries,
} from "./slimDailyCountries.js";
import type { CountryRunResult } from "./types.js";
import {
  hydrateJobRunCountries,
  listJobRuns,
  saveJobRun,
  type JobRunRecord,
} from "../runs/index.js";

export type ScrubBlockedCompaniesResult = {
  scanned: number;
  updated: number;
  skipped: number;
  removedJobs: number;
};

function scrubCountries(countries: CountryRunResult[]): {
  countries: CountryRunResult[];
  removed: number;
} {
  let removed = 0;
  const next = countries.map((country) => {
    const categories = (country.categories ?? []).map((category) => {
      const before = category.jobs?.length ?? 0;
      const jobs = filterBlockedCompanies(category.jobs ?? []);
      removed += before - jobs.length;
      return { ...category, jobs };
    });
    return {
      ...country,
      categories,
      totalJobs: countUniqueJobs(categories),
    };
  });

  return { countries: next, removed };
}

function runHadBlockedJobs(run: JobRunRecord): boolean {
  for (const country of run.countries ?? []) {
    for (const category of country.categories ?? []) {
      for (const job of category.jobs ?? []) {
        if (isBlockedCompany(job.company)) return true;
      }
    }
  }

  // Legacy top-level categories
  for (const category of run.categories ?? []) {
    for (const job of (category.jobs ?? []) as Array<{ company?: string }>) {
      if (isBlockedCompany(job.company)) return true;
    }
  }

  return false;
}

async function listAllRunsFull(): Promise<JobRunRecord[]> {
  const all: JobRunRecord[] = [];
  let cursor: string | undefined;

  do {
    const page = await listJobRuns(50, cursor);
    all.push(...page.runs);
    cursor = page.nextCursor;
  } while (cursor);

  return all.map(hydrateJobRunCountries);
}

/** Remove blocked-company jobs from every stored run (hourly + daily). */
export async function scrubBlockedCompaniesFromRuns(): Promise<ScrubBlockedCompaniesResult> {
  const runs = await listAllRunsFull();
  let updated = 0;
  let skipped = 0;
  let removedJobs = 0;

  for (const run of runs) {
    if (!runHadBlockedJobs(run)) {
      skipped += 1;
      continue;
    }

    const { countries, removed } = scrubCountries(run.countries ?? []);
    removedJobs += removed;

    const isDaily = run.reportKind === "daily";
    const compact = slimDailyCountries(countries, "compact");
    const toSave = isDaily ? compact : countries;
    const useGzip =
      isDaily && Buffer.byteLength(JSON.stringify(toSave), "utf8") > 300_000;

    const saveResult = await saveJobRun(
      {
        location: run.location,
        fetchedAt: run.fetchedAt,
        postedWithin: run.postedWithin,
        postedWithinLabel: run.postedWithinLabel,
        countries: useGzip ? countryStubs(compact) : toSave,
        countryCount: run.countryCount ?? toSave.length,
        scrapeRegion: run.scrapeRegion,
        reportKind: run.reportKind ?? "hourly",
        dayKey: run.dayKey,
        dayLabel: run.dayLabel,
        scrapeCount: run.scrapeCount,
        ...(useGzip ? { countriesGzip: gzipCountries(compact) } : {}),
      },
      run.emailSent
        ? { sent: true, provider: "resend" }
        : {
            sent: false,
            skipped: true,
            reason: run.emailReason ?? "preserved",
          }
    );

    if (saveResult.saved) {
      updated += 1;
      console.log(
        `[scrub] updated ${run.scrapeRegion ?? "europe"} ${run.reportKind ?? "hourly"} ${run.fetchedAt} (−${removed} jobs)`
      );
    } else {
      skipped += 1;
      console.log(`[scrub] skip save ${run.fetchedAt}: ${saveResult.reason}`);
    }
  }

  return {
    scanned: runs.length,
    updated,
    skipped,
    removedJobs,
  };
}
