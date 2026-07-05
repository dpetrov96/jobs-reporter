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
        className="h-10 w-10 shrink-0 rounded-lg object-cover ring-1 ring-zinc-100 sm:h-11 sm:w-11 sm:rounded-xl"
        loading="lazy"
      />
    );
  }

  return (
    <div
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white text-[10px] font-semibold text-zinc-600 ring-1 ring-zinc-200 sm:h-11 sm:w-11 sm:rounded-xl"
      aria-hidden
    >
      {companyInitials(company)}
    </div>
  );
}

function JobCard({
  job,
  fallbackLocation,
}: {
  job: JobListing;
  fallbackLocation: string;
}) {
  const mode = workModeLabel(job.workMode);
  const when = job.dateLabel ?? job.datePosted ?? "New";
  const where = job.location ?? fallbackLocation;

  return (
    <li>
      <a
        href={job.url}
        target="_blank"
        rel="noreferrer"
        className="group flex gap-3 rounded-xl border border-white/80 bg-white p-3 shadow-sm transition active:scale-[0.99] sm:gap-3.5 sm:rounded-2xl sm:p-4 sm:shadow-[0_1px_2px_rgba(0,0,0,0.04)] sm:hover:-translate-y-px sm:hover:border-emerald-100 sm:hover:shadow-md"
      >
        <CompanyLogo company={job.company} logoUrl={job.companyLogoUrl} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-[13px] font-semibold leading-snug text-zinc-900 sm:text-sm sm:group-hover:text-emerald-700">
              {job.title}
            </h3>
            <span className="mt-0.5 shrink-0 text-xs text-zinc-300 sm:text-sm sm:group-hover:text-emerald-500" aria-hidden>
              ↗
            </span>
          </div>
          <p className="mt-0.5 text-xs text-zinc-600 sm:text-sm">{job.company}</p>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] text-zinc-400 sm:text-xs">
              {where} · {when}
            </span>
            {mode ? (
              <span className="rounded-md bg-zinc-50 px-1.5 py-0.5 text-[10px] font-medium text-zinc-500 ring-1 ring-inset ring-zinc-100">
                {mode}
              </span>
            ) : null}
          </div>
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
    <section
      className={`overflow-hidden rounded-2xl border border-zinc-100 border-l-4 ring-1 ring-inset ${theme.border} ${theme.bg} ${theme.ring}`}
    >
      <header className="flex items-center justify-between gap-3 border-b border-black/[0.04] px-3.5 py-3 sm:px-5 sm:py-3.5">
        <h3 className={`text-sm font-bold capitalize sm:text-base ${theme.title}`}>
          {category.keyword}
        </h3>
        <span
          className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold tabular-nums sm:text-xs ${theme.badge}`}
        >
          {category.jobs.length}
        </span>
      </header>

      <div className="p-3 sm:p-4">
        {isEmpty ? (
          <p className="py-4 text-center text-xs text-zinc-400 sm:text-sm">
            No jobs in {postedWithinLabel}
          </p>
        ) : (
          <ul className="flex flex-col gap-2.5 lg:grid lg:grid-cols-2 lg:gap-3">
            {category.jobs.map((job) => (
              <JobCard key={job.id} job={job} fallbackLocation={fallbackLocation} />
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
