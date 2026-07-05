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
}: {
  apiUrl: string;
  onTriggered?: () => void;
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
      setError(err instanceof Error ? err.message : "Failed to check rate limit");
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
      setMessage(result.message ?? "Fetch started");
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

      setError(err instanceof Error ? err.message : "Failed to trigger fetch");
    } finally {
      setSubmitting(false);
    }
  }

  const disabled = loading || submitting || !canTrigger;

  return (
    <div className="flex flex-col gap-2.5 border-b border-zinc-100 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <div className="min-w-0 text-xs text-zinc-400">
        {message ?? error ?? "Manual refresh · 30 min cooldown"}
      </div>
      <button
        type="button"
        disabled={disabled}
        onClick={() => void handleTrigger()}
        className="min-h-11 w-full shrink-0 rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition active:scale-[0.98] hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-40 sm:min-h-0 sm:w-auto sm:rounded-lg sm:px-3.5 sm:py-1.5 sm:text-xs"
      >
        {submitting ? "Starting…" : canTrigger ? "Run now" : `Wait ${formatCooldown(retryAfterSeconds)}`}
      </button>
    </div>
  );
}
