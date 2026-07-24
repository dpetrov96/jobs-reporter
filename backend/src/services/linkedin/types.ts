export interface JobListing {
  id: string;
  linkedInJobId: string;
  title: string;
  company: string;
  url: string;
  location?: string;
  employmentType?: string;
  datePosted?: string;
  dateLabel?: string;
  applicantCount?: number;
  applicantsLabel?: string;
  keyword?: string;
  companyLogoUrl?: string;
  description?: string;
}

export interface JobCategoryResult {
  keyword: string;
  jobs: JobListing[];
}
