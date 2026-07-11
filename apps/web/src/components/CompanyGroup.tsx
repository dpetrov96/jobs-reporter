import type { JobListing } from "@jobs-reporter/shared";
import {
  formatApplicants,
  isHighApplicantJob,
  isJobFreshWithinMinutes,
  jobDateDisplay,
  workModeLabel,
} from "@jobs-reporter/shared";
import type { CompanyGroup as CompanyGroupData } from "../utils/groupByCompany";
import { formatKeywordBadge } from "@jobs-reporter/shared";

function companyInitials(company?: string): string {
  const name = (company ?? "").trim();
  return (
    name
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
        className="h-10 w-10 shrink-0 rounded object-cover bg-zinc-100"
        loading="lazy"
      />
    );
  }

  return (
    <div
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-zinc-100 text-[11px] font-semibold text-zinc-500"
      aria-hidden
    >
      {companyInitials(company)}
    </div>
  );
}

function CompactJobRow({
  job,
  fallbackLocation,
}: {
  job: JobListing;
  fallbackLocation: string;
}) {
  const mode = workModeLabel(job.workMode);
  const when = jobDateDisplay(job);
  const isFresh = isJobFreshWithinMinutes(job, 15);
  const applicants = formatApplicants(job);
  const where = job.location ?? fallbackLocation;
  const highApplicants = isHighApplicantJob(job);

  return (
    <li>
      <a
        href={job.url}
        target="_blank"
        rel="noreferrer"
        className="group flex items-baseline justify-between gap-3 py-2 pl-[52px] pr-1 text-sm transition hover:bg-zinc-50 sm:pr-2"
      >
        <div className="min-w-0 flex-1">
          <span className="font-medium text-zinc-900 group-hover:text-[#0a66c2]">{job.title}</span>
          <span className="mt-0.5 block truncate text-xs text-zinc-500 sm:mt-0 sm:inline sm:before:mx-1.5 sm:before:content-['·']">
            {where}
            {applicants ? (
              <>
                <span className="mx-1" aria-hidden>
                  ·
                </span>
                <span
                  className={
                    highApplicants
                      ? "rounded bg-red-100 px-1.5 py-0.5 font-semibold text-red-700 ring-1 ring-inset ring-red-200"
                      : undefined
                  }
                >
                  {applicants}
                </span>
              </>
            ) : null}
            <span className="mx-1" aria-hidden>
              ·
            </span>
            <span className={isFresh ? "font-medium text-emerald-600" : undefined}>{when}</span>
            {mode ? (
              <>
                <span className="mx-1" aria-hidden>
                  ·
                </span>
                {mode}
              </>
            ) : null}
          </span>
        </div>
        {job.keyword ? (
          <span
            className="shrink-0 rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium text-zinc-600"
            title={job.keyword}
          >
            {formatKeywordBadge(job.keyword)}
          </span>
        ) : null}
      </a>
    </li>
  );
}

export function CompanyGroup({
  group,
  fallbackLocation,
}: {
  group: CompanyGroupData;
  fallbackLocation: string;
}) {
  return (
    <section>
      <header className="flex items-center gap-3 border-b border-zinc-100 bg-zinc-50/80 px-1 py-2.5 sm:px-2">
        <CompanyLogo company={group.company} logoUrl={group.logoUrl} />
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold text-zinc-900 sm:text-[15px]">{group.company}</h3>
          <p className="text-xs text-zinc-500">
            {group.jobs.length} {group.jobs.length === 1 ? "opening" : "openings"}
          </p>
        </div>
      </header>

      <ul className="divide-y divide-zinc-100">
        {group.jobs.map((job) => (
          <CompactJobRow key={job.id} job={job} fallbackLocation={fallbackLocation} />
        ))}
      </ul>
    </section>
  );
}
