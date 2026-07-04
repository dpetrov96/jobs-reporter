import type { JobRunRecord } from "@jobs-reporter/shared";
import { formatRunDate } from "@jobs-reporter/shared";
import { CategoryBlock } from "./CategoryBlock";

export function RunReport({ run }: { run: JobRunRecord }) {
  return (
    <>
      <div className="panel-head run-report-head">
        <div>
          <h2>{formatRunDate(run.fetchedAt)}</h2>
          <p className="subtitle">
            {run.location} · {run.postedWithinLabel} · {run.totalJobs} jobs
          </p>
        </div>
        <span className={`status ${run.emailSent ? "ok" : "muted"}`}>
          {run.emailSent ? "Email sent" : run.emailReason ?? "Email skipped"}
        </span>
      </div>

      {run.categories.map((category) => (
        <CategoryBlock
          key={category.keyword}
          category={category}
          postedWithinLabel={run.postedWithinLabel}
        />
      ))}
    </>
  );
}
