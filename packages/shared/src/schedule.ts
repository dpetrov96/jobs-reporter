export const CRON_TIMEZONE = "Europe/Sofia";
export const CRON_WORKING_HOURS = { start: 9, end: 23 } as const;

export function getSofiaParts(date: Date): { hour: number; minute: number; second: number } {
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: CRON_TIMEZONE,
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    hour12: false,
  });

  const [hour, minute, second] = formatter.format(date).split(":").map(Number);
  return { hour, minute, second };
}

export function isCronWorkingHour(date = new Date()): boolean {
  const { hour } = getSofiaParts(date);
  return hour >= CRON_WORKING_HOURS.start && hour <= CRON_WORKING_HOURS.end;
}

/** First ~10 minutes of each working hour — cron may still be running. */
export function isNearCronSlot(date = new Date()): boolean {
  const { hour, minute } = getSofiaParts(date);
  return (
    hour >= CRON_WORKING_HOURS.start &&
    hour <= CRON_WORKING_HOURS.end &&
    minute < 10
  );
}

export function getNextScheduledFetch(from = new Date()): Date {
  const startMs = Math.ceil(from.getTime() / 60_000) * 60_000;

  for (let offsetMin = 0; offsetMin < 24 * 60; offsetMin += 1) {
    const candidate = new Date(startMs + offsetMin * 60_000);
    const { hour, minute } = getSofiaParts(candidate);

    if (
      minute === 0 &&
      hour >= CRON_WORKING_HOURS.start &&
      hour <= CRON_WORKING_HOURS.end &&
      candidate.getTime() > from.getTime() + 500
    ) {
      return candidate;
    }
  }

  throw new Error("Could not compute next scheduled fetch");
}

export function getMsUntilNextScheduledFetch(from = new Date()): number {
  return Math.max(0, getNextScheduledFetch(from).getTime() - from.getTime());
}

export function formatCountdown(ms: number): string {
  if (ms <= 0) return "now";

  const totalSec = Math.ceil(ms / 1000);
  const hours = Math.floor(totalSec / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;

  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${String(seconds).padStart(2, "0")}s`;
  return `${seconds}s`;
}
