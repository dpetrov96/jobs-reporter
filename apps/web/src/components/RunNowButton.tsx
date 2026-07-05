import { useCallback, useEffect, useState } from "react";
import { getTriggerFetchStatus, triggerFetch } from "@jobs-reporter/shared";

function formatCooldown(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.ceil(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rem = minutes % 60;
  return rem > 0 ? `${hours}h ${rem}m` : `${hours}h`;
}

export function RunNowButton({
  apiUrl,
  onTriggered,
  compact = false,
}: {
  apiUrl: string;
  onTriggered?: () => void;
  compact?: boolean;
}) {
  const [canTrigger, setCanTrigger] = useState(false);
  const [retryAfterSeconds, setRetryAfterSeconds] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refreshStatus = useCallback(async () => {
    try {
      const status = await getTriggerFetchStatus(apiUrl);
      setCanTrigger(status.canTrigger);
      setRetryAfterSeconds(status.retryAfterSeconds);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not check refresh status");
    } finally {
      setLoading(false);
    }
  }, [apiUrl]);

  useEffect(() => {
    void refreshStatus();
  }, [refreshStatus]);

  useEffect(() => {
    if (retryAfterSeconds <= 0) return;

    const timer = window.setInterval(() => {
      setRetryAfterSeconds((current) => {
        if (current <= 1) {
          void refreshStatus();
          return 0;
        }
        return current - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [retryAfterSeconds, refreshStatus]);

  async function handleTrigger() {
    setSubmitting(true);
    setError(null);
    setMessage(null);

    try {
      const result = await triggerFetch(apiUrl);
      setMessage("Updating…");
      setCanTrigger(false);
      setRetryAfterSeconds(result.retryAfterSeconds ?? 1800);
      onTriggered?.();
      void refreshStatus();
    } catch (err) {
      const retry =
        typeof err === "object" && err && "retryAfterSeconds" in err
          ? Number((err as { retryAfterSeconds?: number }).retryAfterSeconds)
          : 0;

      if (retry > 0) {
        setRetryAfterSeconds(retry);
        setCanTrigger(false);
      }

      setError(err instanceof Error ? err.message : "Refresh failed");
    } finally {
      setSubmitting(false);
    }
  }

  const disabled = loading || submitting || !canTrigger;

  const label = submitting
    ? "Updating…"
    : canTrigger
      ? "Refresh"
      : `In ${formatCooldown(retryAfterSeconds)}`;

  if (compact) {
    return (
      <div className="flex shrink-0 flex-col items-end gap-0.5">
        <button
          type="button"
          disabled={disabled}
          onClick={() => void handleTrigger()}
          className="rounded-md bg-zinc-900 px-2.5 py-1 text-[11px] font-medium text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:bg-zinc-300"
        >
          {label}
        </button>
        {(message || error) && (
          <span className={`max-w-[8rem] text-right text-[10px] leading-tight ${error ? "text-red-500" : "text-zinc-400"}`}>
            {error ?? message}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="mb-4 flex flex-col gap-2 rounded-2xl bg-zinc-50 p-3.5 ring-1 ring-zinc-200/70 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <p className="text-xs text-zinc-500">
        {error ?? message ?? "Check for new jobs manually (once every 30 minutes)"}
      </p>
      <button
        type="button"
        disabled={disabled}
        onClick={() => void handleTrigger()}
        className="min-h-10 w-full shrink-0 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:bg-zinc-300 sm:w-auto"
      >
        {label}
      </button>
    </div>
  );
}
