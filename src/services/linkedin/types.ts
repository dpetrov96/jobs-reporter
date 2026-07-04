export interface JobListing {
  id: string;
  linkedInJobId: string;
  title: string;
  company: string;
  url: string;
  location?: string;
  workMode?: "remote" | "hybrid" | "onsite";
  datePosted?: string;
  dateLabel?: string;
  keyword?: string;
  companyLogoUrl?: string;
}

export interface JobCategoryResult {
  keyword: string;
  jobs: JobListing[];
}
