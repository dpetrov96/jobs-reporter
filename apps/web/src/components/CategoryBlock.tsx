import type { JobCategoryResult, JobListing } from "@jobs-reporter/shared";
import { workModeLabel } from "@jobs-reporter/shared";

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
        className="h-8 w-8 shrink-0 rounded-md object-cover"
        loading="lazy"
      />
    );
  }

  return (
    <div
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-zinc-200 text-[10px] font-semibold text-zinc-600"
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
  const meta = [
    job.location ?? fallbackLocation,
    workModeLabel(job.workMode),
    job.dateLabel ?? job.datePosted ?? "New",
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <li className="flex gap-3 border-b border-zinc-50 py-3 last:border-0">
      <CompanyLogo company={job.company} logoUrl={job.companyLogoUrl} />
      <div className="min-w-0 flex-1">
        <a
          className="text-sm font-medium text-zinc-900 hover:text-emerald-700"
          href={job.url}
          target="_blank"
          rel="noreferrer"
        >
          {job.title}
        </a>
        <div className="mt-0.5 text-xs text-zinc-600">{job.company}</div>
        <div className="mt-0.5 text-xs text-zinc-400">{meta}</div>
      </div>
    </li>
  );
}

export function CategoryBlock({
  category,
  postedWithinLabel,
  fallbackLocation = "—",
  flat = false,
  compact = false,
}: {
  category: JobCategoryResult;
  postedWithinLabel: string;
  fallbackLocation?: string;
  flat?: boolean;
  compact?: boolean;
}) {
  if ((compact || flat) && category.jobs.length === 0) {
    return null;
  }

  if (flat) {
    return (
      <div className="mb-5 last:mb-0">
        <div className="mb-1 px-0.5 text-[11px] font-medium uppercase tracking-wider text-zinc-400">
          {category.keyword}
          <span className="ml-1.5 normal-case tracking-normal text-zinc-300">
            {category.jobs.length}
          </span>
        </div>
        <ul>
          {category.jobs.map((job) => (
            <JobRow key={job.id} job={job} fallbackLocation={fallbackLocation} />
          ))}
        </ul>
      </div>
    );
  }

  return (
    <section className="mb-4">
      <div className="mb-1 text-[11px] font-medium uppercase tracking-wider text-zinc-400">
        {category.keyword} · {category.jobs.length}
      </div>
      {category.jobs.length === 0 ? (
        <p className="text-sm text-zinc-400">No jobs in {postedWithinLabel}.</p>
      ) : (
        <ul>
          {category.jobs.map((job) => (
            <JobRow key={job.id} job={job} fallbackLocation={fallbackLocation} />
          ))}
        </ul>
      )}
    </section>
  );
}
