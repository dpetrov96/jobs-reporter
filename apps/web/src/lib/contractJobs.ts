import type { JobRunRecord } from "@jobs-reporter/shared";
import { isContractEmploymentType, normalizeRun } from "@jobs-reporter/shared";

export function collectContractJobUrls(run: JobRunRecord): string[] {
  const seen = new Set<string>();
  const urls: string[] = [];

  for (const country of normalizeRun(run).countries) {
    for (const category of country.categories) {
      for (const job of category.jobs) {
        if (!isContractEmploymentType(job.employmentType)) continue;
        if (!job.url || seen.has(job.url)) continue;
        seen.add(job.url);
        urls.push(job.url);
      }
    }
  }

  return urls;
}

export function openJobUrlsInNewTabs(urls: string[]): void {
  for (const url of urls) {
    window.open(url, "_blank", "noopener,noreferrer");
  }
}
