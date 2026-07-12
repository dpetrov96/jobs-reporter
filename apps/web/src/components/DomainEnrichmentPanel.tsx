import type { DomainEnrichmentResult } from "@jobs-reporter/shared";
import { getCompanyWebsiteHref } from "../lib/companyLinks";

export function DomainEnrichmentPanel({
  marketLabel,
  processed,
  total,
  progress,
  results,
  running,
  stopping,
  onStop,
}: {
  marketLabel: string;
  processed?: number;
  total?: number;
  progress?: string;
  results?: DomainEnrichmentResult[];
  running: boolean;
  stopping?: boolean;
  onStop: () => void;
}) {
  if (!running && !results?.length) {
    return null;
  }

  const pct =
    total != null && total > 0 && processed != null
      ? Math.min(100, Math.round((processed / total) * 100))
      : null;

  return (
    <div className="mt-3 overflow-hidden rounded-lg border border-zinc-200 bg-zinc-50/50">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 px-3 py-2.5 sm:px-4">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-zinc-800">
            {running ? `Finding domains in ${marketLabel}` : `Domain lookup · ${marketLabel}`}
          </p>
          {progress ? <p className="mt-0.5 truncate text-[11px] text-zinc-500">{progress}</p> : null}
        </div>

        {running ? (
          <button
            type="button"
            onClick={onStop}
            disabled={stopping}
            className="cursor-pointer rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 transition hover:bg-zinc-100 disabled:opacity-50"
          >
            {stopping ? "Stopping…" : "Stop"}
          </button>
        ) : null}
      </div>

      {pct != null ? (
        <div className="px-3 pt-2 sm:px-4">
          <div className="h-1.5 overflow-hidden rounded-full bg-zinc-200">
            <div
              className="h-full rounded-full bg-[#0a66c2] transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="py-1.5 text-[11px] tabular-nums text-zinc-500">
            {processed?.toLocaleString()} / {total?.toLocaleString()} companies
          </p>
        </div>
      ) : null}

      {results?.length ? (
        <ul className="max-h-56 overflow-y-auto divide-y divide-zinc-100 px-3 py-1 sm:px-4">
          {results.map((entry) => {
            const href = entry.domain ? getCompanyWebsiteHref(entry.domain) : null;

            return (
              <li
                key={`${entry.name}-${entry.status}-${entry.domain ?? "x"}`}
                className="flex items-start justify-between gap-3 py-2 text-xs"
              >
                <span className="min-w-0 font-medium text-zinc-800">{entry.name}</span>
                {entry.status === "found" && href ? (
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 font-medium text-[#0a66c2] hover:underline"
                  >
                    {entry.domain} ↗
                  </a>
                ) : (
                  <span className="shrink-0 text-zinc-400">not found</span>
                )}
              </li>
            );
          })}
        </ul>
      ) : running ? (
        <p className="px-3 py-3 text-xs text-zinc-400 sm:px-4">Waiting for first results…</p>
      ) : null}
    </div>
  );
}
