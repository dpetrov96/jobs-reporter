import { useMemo } from "react";
import type { JobRunRecord } from "@jobs-reporter/shared";
import { collectContractJobUrls, openJobUrlsInNewTabs } from "../lib/contractJobs";

export function OpenContractJobsButton({ run }: { run: JobRunRecord }) {
  const contractUrls = useMemo(() => collectContractJobUrls(run), [run]);
  const count = contractUrls.length;

  if (count === 0) return null;

  return (
    <button
      type="button"
      onClick={() => openJobUrlsInNewTabs(contractUrls)}
      className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-2.5 py-1.5 text-xs font-medium text-emerald-800 ring-1 ring-emerald-200/80 transition hover:bg-emerald-100 active:scale-[0.98]"
    >
      <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5" aria-hidden>
        <path d="M4.75 3A1.75 1.75 0 0 0 3 4.75v10.5c0 .966.784 1.75 1.75 1.75h6.5a.75.75 0 0 0 0-1.5h-6.5a.25.25 0 0 1-.25-.25V4.75c0-.138.112-.25.25-.25h10.5a.25.25 0 0 1 .25.25v6.5a.75.75 0 0 0 1.5 0V4.75A1.75 1.75 0 0 0 15.25 3H4.75Z" />
        <path d="M12.25 6.75a.75.75 0 0 0 0 1.5h2.19l-4.72 4.72a.75.75 0 1 0 1.06 1.06l4.72-4.72v2.19a.75.75 0 0 0 1.5 0v-4a.75.75 0 0 0-.75-.75h-4Z" />
      </svg>
      Open all contracts ({count})
    </button>
  );
}
