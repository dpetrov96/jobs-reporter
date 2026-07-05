export function formatRunWhen(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const diffMin = Math.floor((now.getTime() - date.getTime()) / 60_000);

  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin} min ago`;

  const time = date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();

  if (startOfDay === startOfToday) return `Today, ${time}`;
  if (startOfDay === startOfToday - 86_400_000) return `Yesterday, ${time}`;

  return date.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function humanizePostedWithin(label: string): string {
  const value = label.trim();
  if (!value) return "Recent";

  if (/^the last hour$/i.test(value)) return "Last hour";
  if (/^the last 24 hours$/i.test(value)) return "Last 24 hours";
  if (/^the last 7 days$/i.test(value)) return "Last 7 days";

  return value.replace(/^the /i, "").replace(/^\w/, (char) => char.toUpperCase());
}
