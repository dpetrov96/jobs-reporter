import type { JobCategoryResult, JobListing } from "@jobs-reporter/shared";

export interface CompanyGroup {
  company: string;
  logoUrl?: string;
  jobs: JobListing[];
}

function jobSortKey(job: JobListing): number {
  const label = job.dateLabel ?? job.datePosted ?? "";
  if (/just now|minute|hour|today/i.test(label)) return 0;
  return 1;
}

export function groupJobsByCompany(categories: JobCategoryResult[]): CompanyGroup[] {
  const byCompany = new Map<
    string,
    { company: string; logoUrl?: string; jobs: Map<string, JobListing> }
  >();

  for (const category of categories ?? []) {
    for (const job of category.jobs ?? []) {
      const companyName = job.company?.trim();
      if (!companyName) continue;

      const key = companyName.toLowerCase();

      let group = byCompany.get(key);
      if (!group) {
        group = { company: companyName, logoUrl: job.companyLogoUrl, jobs: new Map() };
        byCompany.set(key, group);
      }

      if (job.companyLogoUrl && !group.logoUrl) {
        group.logoUrl = job.companyLogoUrl;
      }

      group.jobs.set(job.id, job);
    }
  }

  return [...byCompany.values()]
    .map((group) => ({
      company: group.company,
      logoUrl: group.logoUrl,
      jobs: [...group.jobs.values()].sort(
        (a, b) => jobSortKey(a) - jobSortKey(b) || a.title.localeCompare(b.title),
      ),
    }))
    .sort(
      (a, b) =>
        b.jobs.length - a.jobs.length || a.company.localeCompare(b.company, undefined, { sensitivity: "base" }),
    );
}
