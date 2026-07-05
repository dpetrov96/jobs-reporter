export function ScanStatusBanner({
  message = "Checking job market…",
  compact = false,
}: {
  message?: string;
  compact?: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-2.5 rounded-lg border border-zinc-200 bg-zinc-50 text-zinc-700 ${
        compact ? "px-2.5 py-1.5 text-xs" : "px-3 py-3 text-sm"
      }`}
      role="status"
      aria-live="polite"
    >
      <span
        className={`inline-block shrink-0 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-600 ${
          compact ? "h-3.5 w-3.5" : "h-4 w-4"
        }`}
      />
      <span>{message}</span>
    </div>
  );
}
