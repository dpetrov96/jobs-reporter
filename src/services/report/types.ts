import type { JobCategoryResult } from "../linkedin/types.js";

export interface JobReportMeta {
  location: string;
  fetchedAt?: string;
  postedWithin?: string;
  postedWithinLabel?: string;
  categories: JobCategoryResult[];
}
