import type { JobCategoryResult, JobListing } from "@jobs-reporter/shared";
import { workModeLabel } from "@jobs-reporter/shared";

function JobRow({
  job,
  fallbackLocation,
}: {
  job: JobListing;
  fallbackLocation: string;
}) {
  const meta = [
    job.company,
    job.location ?? fallbackLocation,
    workModeLabel(job.workMode),
    job.dateLabel ?? job.datePosted ?? "New",
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <li className="rounded-xl border border-transparent px-3 py-2.5 transition hover:border-zinc-200 hover:bg-zinc-50 dark:hover:border-zinc-700 dark:hover:bg-zinc-800/60">
      <a
        className="block text-sm font-semibold text-zinc-900 transition hover:text-emerald-600 dark:text-zinc-100 dark:hover:text-emerald-400"
        href={job.url}
        target="_blank"
        rel="noreferrer"
      >
        {job.title}
      </a>
      <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{meta}</div>
    </li>
  );
}

export function CategoryBlock({
  category,
  postedWithinLabel,
  fallbackLocation = "—",
  compact = false,
}: {
  category: JobCategoryResult;
  postedWithinLabel: string;
  fallbackLocation?: string;
  compact?: boolean;
}) {
  if (compact && category.jobs.length === 0) {
    return null;
  }

  return (
    <section
      className={`overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950 ${
        compact ? "" : "shadow-sm"
      }`}
    >
      <div className="flex items-center justify-between border-b border-zinc-100 bg-zinc-50 px-3 py-2 dark:border-zinc-800 dark:bg-zinc-900">
        <h3 className="text-sm font-semibold lowercase tracking-wide text-zinc-800 dark:text-zinc-200">
          {category.keyword}
        </h3>
        <span className="rounded-full bg-zinc-200 px-2 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
          {category.jobs.length}
        </span>
      </div>

      {category.jobs.length === 0 ? (
        <p className="px-3 py-3 text-sm italic text-zinc-500 dark:text-zinc-400">
          No jobs in {postedWithinLabel}.
        </p>
      ) : (
        <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
          {category.jobs.map((job) => (
            <JobRow key={job.id} job={job} fallbackLocation={fallbackLocation} />
          ))}
        </ul>
      )}
    </section>
  );
}
