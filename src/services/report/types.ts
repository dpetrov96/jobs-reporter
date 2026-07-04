import type { JobCategoryResult } from "../linkedin/types.js";

export interface JobReportMeta {
  location: string;
  fetchedAt?: string;
  postedWithinLabel?: string;
  categories: JobCategoryResult[];
}
