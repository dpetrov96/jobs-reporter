import { Link } from "react-router-dom";
import type { ScrapeRegionId } from "@jobs-reporter/shared";

function todayLink(region: ScrapeRegionId): string {
  return region === "usa" ? "/today?region=usa" : "/today";
}

export function TodayOverviewLink({ region }: { region: ScrapeRegionId }) {
  return (
    <Link
      to={todayLink(region)}
      className="inline-flex items-center gap-1.5 rounded-lg bg-sky-50 px-2.5 py-1.5 text-xs font-medium text-sky-800 ring-1 ring-sky-200/80 transition hover:bg-sky-100 active:scale-[0.98]"
    >
      <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5" aria-hidden>
        <path d="M3 4.75A1.75 1.75 0 0 1 4.75 3h10.5A1.75 1.75 0 0 1 17 4.75v2.5A1.75 1.75 0 0 1 15.25 9H4.75A1.75 1.75 0 0 1 3 7.25v-2.5ZM3 12.25A1.75 1.75 0 0 1 4.75 10.5h10.5A1.75 1.75 0 0 1 17 12.25v3A1.75 1.75 0 0 1 15.25 17H4.75A1.75 1.75 0 0 1 3 15.25v-3Z" />
      </svg>
      All for today
    </Link>
  );
}
