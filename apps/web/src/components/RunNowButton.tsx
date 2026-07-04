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
  const [cooldownMinutes, setCooldownMinutes] = useState(30);
  const [reason, setReason] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refreshStatus = useCallback(async () => {
    try {
      const status = await getTriggerFetchStatus(apiUrl);
      setCanTrigger(status.canTrigger);
      setRetryAfterSeconds(status.retryAfterSeconds);
      setCooldownMinutes(status.cooldownMinutes);
      setReason(status.reason ?? null);
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
      setRetryAfterSeconds(result.retryAfterSeconds ?? cooldownMinutes * 60);
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
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Manual fetch</h3>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            Strict rate limit: 1 run per {cooldownMinutes} min · protects LinkedIn quota
          </p>
        </div>
        <button
          type="button"
          disabled={disabled}
          onClick={() => void handleTrigger()}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-emerald-700 dark:hover:bg-emerald-600"
        >
          {submitting ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              Starting…
            </>
          ) : canTrigger ? (
            "Run now"
          ) : (
            `Wait ${formatCooldown(retryAfterSeconds)}`
          )}
        </button>
      </div>

      {reason && !canTrigger ? (
        <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">{reason}</p>
      ) : null}
      {message ? (
        <p className="mt-2 text-xs text-emerald-700 dark:text-emerald-300">{message}</p>
      ) : null}
      {error ? <p className="mt-2 text-xs text-red-600 dark:text-red-300">{error}</p> : null}
    </div>
  );
}
