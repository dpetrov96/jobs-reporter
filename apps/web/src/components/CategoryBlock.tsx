import type { JobCategoryResult, JobListing } from "@jobs-reporter/shared";
import { workModeLabel } from "@jobs-reporter/shared";

function initials(company: string): string {
  return company
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "?";
}

function JobRow({ job }: { job: JobListing }) {
  const meta = [
    job.company,
    job.location ?? "BG",
    workModeLabel(job.workMode),
    job.dateLabel ?? job.datePosted ?? "New",
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <li className="job-row">
      {job.companyLogoUrl ? (
        <img className="job-logo" src={job.companyLogoUrl} alt="" />
      ) : (
        <div className="job-logo-fallback">{initials(job.company)}</div>
      )}
      <div className="job-body">
        <a className="job-title" href={job.url} target="_blank" rel="noreferrer">
          {job.title}
        </a>
        <div className="job-meta">{meta}</div>
      </div>
    </li>
  );
}

export function CategoryBlock({
  category,
  postedWithinLabel,
}: {
  category: JobCategoryResult;
  postedWithinLabel: string;
}) {
  return (
    <section className="category-card">
      <div className="category-head">
        <h3>{category.keyword}</h3>
        <span className="badge">{category.jobs.length}</span>
      </div>
      {category.jobs.length === 0 ? (
        <p className="empty">No jobs in {postedWithinLabel}.</p>
      ) : (
        <ul className="job-list">
          {category.jobs.map((job) => (
            <JobRow key={job.id} job={job} />
          ))}
        </ul>
      )}
    </section>
  );
}
