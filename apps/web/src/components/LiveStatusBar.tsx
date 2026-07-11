import { formatRunWhen } from "@jobs-reporter/shared";

export function LiveStatusBar({
  countdownLabel,
  nearCronSlot,
  lastFetchedAt,
  newRunFlash,
  onDismissFlash,
}: {
  countdownLabel: string;
  nearCronSlot: boolean;
  lastFetchedAt?: string;
  newRunFlash: { totalJobs: number } | null;
  onDismissFlash: () => void;
}) {
  return (
    <div className="space-y-2">
      {newRunFlash ? (
        <div
          className="flex items-center justify-between gap-3 rounded-xl bg-emerald-600 px-3 py-2.5 text-sm text-white shadow-sm sm:px-4"
          role="status"
          aria-live="assertive"
        >
          <p className="font-medium">
            New scan loaded · <span className="tabular-nums">{newRunFlash.totalJobs}</span> jobs
          </p>
          <button
            type="button"
            onClick={onDismissFlash}
            className="shrink-0 rounded-lg px-2 py-1 text-xs font-medium text-emerald-100 transition hover:bg-emerald-500/60"
          >
            Dismiss
          </button>
        </div>
      ) : null}

      <div
        className="flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-xl bg-emerald-50/80 px-3 py-2.5 text-sm ring-1 ring-emerald-200/70 sm:px-4"
        role="status"
        aria-live="polite"
      >
        <span className="inline-flex items-center gap-2 font-semibold text-emerald-800">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
          </span>
          Live
        </span>

        <span className="text-emerald-900">
          Next auto-scan in{" "}
          <strong className="tabular-nums text-emerald-950">{countdownLabel}</strong>
        </span>

        {nearCronSlot ? (
          <span className="text-xs font-medium text-emerald-700">· Checking for updates…</span>
        ) : null}

        {lastFetchedAt ? (
          <span className="text-xs text-emerald-700">
            · Updated {formatRunWhen(lastFetchedAt)}
          </span>
        ) : null}
      </div>
    </div>
  );
}
