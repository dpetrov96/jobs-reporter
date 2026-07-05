import type { JobCategoryResult, JobListing } from "@jobs-reporter/shared";
import { workModeLabel } from "@jobs-reporter/shared";
import { getCategoryTheme } from "./categoryTheme";

function companyInitials(company: string): string {
  return (
    company
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("") || "?"
  );
}

function CompanyLogo({ company, logoUrl }: { company: string; logoUrl?: string }) {
  if (logoUrl) {
    return (
      <img
        src={logoUrl}
        alt=""
        className="h-12 w-12 shrink-0 rounded object-cover bg-zinc-100"
        loading="lazy"
      />
    );
  }

  return (
    <div
      className="flex h-12 w-12 shrink-0 items-center justify-center rounded bg-zinc-100 text-xs font-semibold text-zinc-500"
      aria-hidden
    >
      {companyInitials(company)}
    </div>
  );
}

function JobRow({
  job,
  fallbackLocation,
}: {
  job: JobListing;
  fallbackLocation: string;
}) {
  const mode = workModeLabel(job.workMode);
  const when = job.dateLabel ?? job.datePosted ?? "Recently";
  const where = job.location ?? fallbackLocation;

  return (
    <li>
      <a
        href={job.url}
        target="_blank"
        rel="noreferrer"
        className="group flex gap-3 px-1 py-3.5 transition hover:bg-zinc-50 sm:gap-4 sm:px-2 sm:py-4"
      >
        <CompanyLogo company={job.company} logoUrl={job.companyLogoUrl} />
        <div className="min-w-0 flex-1">
          <h3 className="text-[15px] font-semibold leading-snug text-zinc-900 group-hover:text-[#0a66c2] sm:text-base">
            {job.title}
          </h3>
          <p className="mt-0.5 text-sm text-zinc-700">{job.company}</p>
          <p className="mt-1 text-xs text-zinc-500 sm:text-sm">
            {where}
            <span className="mx-1" aria-hidden>
              ·
            </span>
            {when}
            {mode ? (
              <>
                <span className="mx-1" aria-hidden>
                  ·
                </span>
                {mode}
              </>
            ) : null}
          </p>
        </div>
      </a>
    </li>
  );
}

export function CategoryBlock({
  category,
  postedWithinLabel,
  fallbackLocation = "—",
  themeIndex = 0,
}: {
  category: JobCategoryResult;
  postedWithinLabel: string;
  fallbackLocation?: string;
  themeIndex?: number;
}) {
  const theme = getCategoryTheme(themeIndex);
  const isEmpty = category.jobs.length === 0;

  return (
    <section>
      <header className="flex items-baseline gap-2 border-b border-zinc-200 py-2.5 sm:py-3">
        <span className={`h-2 w-2 shrink-0 rounded-full ${theme.dot}`} aria-hidden />
        <h3 className={`text-sm font-semibold capitalize sm:text-[15px] ${theme.label}`}>
          {category.keyword}
        </h3>
        <span className="text-xs tabular-nums text-zinc-400 sm:text-sm">
          {category.jobs.length} {category.jobs.length === 1 ? "job" : "jobs"}
        </span>
      </header>

      {isEmpty ? (
        <p className="py-6 text-sm text-zinc-400">No jobs in {postedWithinLabel}</p>
      ) : (
        <ul className="divide-y divide-zinc-200">
          {category.jobs.map((job) => (
            <JobRow key={job.id} job={job} fallbackLocation={fallbackLocation} />
          ))}
        </ul>
      )}
    </section>
  );
}
