import type { JobCategoryResult } from "./types.js";

/** Unique listings by job id (same job can match multiple keywords). */
export function countUniqueJobs(categories: JobCategoryResult[] | undefined): number {
  const ids = new Set<string>();

  for (const category of categories ?? []) {
    for (const job of category.jobs ?? []) {
      if (job.id) ids.add(job.id);
    }
  }

  return ids.size;
}
