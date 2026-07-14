import { countUniqueJobs } from "../../shared/jobCounts.js";
import type { JobCategoryResult, JobListing } from "../linkedin/types.js";
import type { CountryRunResult } from "./types.js";
import type { JobRunRecord } from "../runs/index.js";

function mergeJobsByKeyword(
  target: Map<string, Map<string, JobListing>>,
  categories: JobCategoryResult[]
): void {
  for (const category of categories) {
    if (!target.has(category.keyword)) {
      target.set(category.keyword, new Map());
    }

    const jobs = target.get(category.keyword)!;
    for (const job of category.jobs) {
      jobs.set(job.id, job);
    }
  }
}

/** Merge all hourly runs for a day into deduplicated country results. */
export function aggregateDailyCountries(runs: JobRunRecord[]): CountryRunResult[] {
  const byCountry = new Map<
    string,
    {
      meta: Pick<CountryRunResult, "location" | "geoId" | "flag" | "code">;
      jobsByKeyword: Map<string, Map<string, JobListing>>;
    }
  >();

  for (const run of runs) {
    for (const country of run.countries) {
      let entry = byCountry.get(country.code);
      if (!entry) {
        entry = {
          meta: {
            location: country.location,
            geoId: country.geoId,
            flag: country.flag,
            code: country.code,
          },
          jobsByKeyword: new Map(),
        };
        byCountry.set(country.code, entry);
      }

      mergeJobsByKeyword(entry.jobsByKeyword, country.categories);
    }
  }

  return [...byCountry.values()].map(({ meta, jobsByKeyword }) => {
    const categories: JobCategoryResult[] = [...jobsByKeyword.entries()].map(
      ([keyword, jobs]) => ({
        keyword,
        jobs: [...jobs.values()],
      })
    );
    const totalJobs = countUniqueJobs(categories);
    return { ...meta, categories, totalJobs };
  });
}
