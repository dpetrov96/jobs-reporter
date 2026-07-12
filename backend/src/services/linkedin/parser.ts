import * as cheerio from "cheerio";
import type { JobListing } from "./types.js";

function parseApplicantsFromText(text: string): Pick<JobListing, "applicantCount" | "applicantsLabel"> {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) return {};

  if (/be an early applicant/i.test(normalized) && !/\d+\s*applicants?/i.test(normalized)) {
    return { applicantsLabel: "Early applicant" };
  }

  const match = normalized.match(/(?:be among the first (\d+)|over (\d+)|(\d+))\s*applicants?/i);
  if (!match) return {};

  const count = Number(match[1] ?? match[2] ?? match[3]);
  if (!Number.isFinite(count)) return {};

  const labelMatch = normalized.match(/(?:be among the first \d+|over \d+|\d+)\s*applicants?/i);
  return {
    applicantCount: count,
    applicantsLabel: labelMatch?.[0] ?? `${count} applicants`,
  };
}

function parseApplicantsFromCard(
  $card: ReturnType<cheerio.CheerioAPI>,
  $: cheerio.CheerioAPI
): Pick<JobListing, "applicantCount" | "applicantsLabel"> {
  const footerTexts = $card
    .find(".job-search-card__footer-item, .base-search-card__metadata")
    .toArray()
    .map((element) => $(element).text().replace(/\s+/g, " ").trim())
    .filter(Boolean);

  for (const text of footerTexts) {
    const parsed = parseApplicantsFromText(text);
    if (parsed.applicantCount != null || parsed.applicantsLabel) {
      return parsed;
    }
  }

  return parseApplicantsFromText($card.text().replace(/\s+/g, " "));
}

export const LINKEDIN_JOB_DETAIL_BASE =
  "https://www.linkedin.com/jobs-guest/jobs/api/jobPosting";

export function buildLinkedInJobDetailUrl(jobId: string): string {
  const numericId = linkedInNumericIdFromJobId(jobId) ?? jobId.replace(/^linkedin-/, "");
  return `${LINKEDIN_JOB_DETAIL_BASE}/${numericId}`;
}

export function parseLinkedInJobDetailPage(html: string): Pick<
  JobListing,
  "dateLabel" | "applicantCount" | "applicantsLabel" | "description"
> {
  const $ = cheerio.load(html);

  const dateLabel =
    $(".posted-time-ago__text").first().text().replace(/\s+/g, " ").trim() || undefined;

  const applicantText =
    $(".num-applicants__caption").first().text().replace(/\s+/g, " ").trim() || "";

  return {
    dateLabel,
    description: parseJobDescriptionFromDetailHtml(html),
    ...parseApplicantsFromText(applicantText),
  };
}

export function parseJobDescriptionFromDetailHtml(html: string): string | undefined {
  const $ = cheerio.load(html);

  const candidates = [
    $(".description__text .show-more-less-html__markup").first(),
    $(".description__text").first(),
    $(".show-more-less-html__markup").first(),
  ];

  for (const element of candidates) {
    const text = element.text().replace(/\s+/g, " ").trim();
    if (text.length >= 80) {
      return text;
    }
  }

  return undefined;
}

export const LINKEDIN_SEARCH_BASE =
  "https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search";

export const LINKEDIN_BULGARIA_GEO_ID = "105333783";
export const LINKEDIN_LOCATION = "Bulgaria";
export const LINKEDIN_PER_PAGE = 10;

export function linkedInJobIdFromUrn(urn?: string): string | undefined {
  const match = urn?.match(/urn:li:jobPosting:(\d+)/);
  return match ? `linkedin-${match[1]}` : undefined;
}

export function linkedInNumericIdFromJobId(id: string): string | undefined {
  const match = id.match(/^linkedin-(\d+)$/);
  return match?.[1];
}

export function linkedInJobViewUrl(jobId: string): string {
  const numericId = linkedInNumericIdFromJobId(jobId);
  if (!numericId) return jobId;
  return `https://www.linkedin.com/jobs/view/${numericId}`;
}

export function buildLinkedInSearchUrl(options: {
  keywords: string;
  start?: number;
  geoId?: string;
  location?: string;
  sortBy?: "DD" | "R";
  postedWithin?: string;
}): string {
  const params = new URLSearchParams({
    keywords: options.keywords,
    location: options.location ?? LINKEDIN_LOCATION,
    geoId: options.geoId ?? LINKEDIN_BULGARIA_GEO_ID,
    start: String(options.start ?? 0),
    sortBy: options.sortBy ?? "DD",
    f_TPR: options.postedWithin ?? "r3600",
  });

  return `${LINKEDIN_SEARCH_BASE}?${params.toString()}`;
}

function parseLocationAndWorkMode(locationText: string): {
  location?: string;
  workMode?: "remote" | "hybrid" | "onsite";
} {
  const text = locationText.replace(/\s+/g, " ").trim();
  if (!text) return {};

  if (/\bremote\b/i.test(text)) {
    return { location: text, workMode: "remote" };
  }

  if (/\bhybrid\b/i.test(text)) {
    return {
      location: text.replace(/\bhybrid\b/gi, "").replace(/[()]/g, "").trim(),
      workMode: "hybrid",
    };
  }

  return { location: text, workMode: "onsite" };
}

export function parseLinkedInListingPage(html: string): JobListing[] {
  const $ = cheerio.load(html);
  const jobs: JobListing[] = [];

  $("div.base-search-card[data-entity-urn], li div.job-search-card[data-entity-urn]").each(
    (_, element) => {
      const $card = $(element);
      const urn = $card.attr("data-entity-urn");
      const id = linkedInJobIdFromUrn(urn);
      if (!id) return;

      const title = $card
        .find(".base-search-card__title")
        .first()
        .text()
        .replace(/\s+/g, " ")
        .trim();
      if (!title) return;

      const company = $card
        .find(".base-search-card__subtitle a, .hidden-nested-link")
        .first()
        .text()
        .replace(/\s+/g, " ")
        .trim();

      const locationText = $card
        .find(".job-search-card__location")
        .first()
        .text()
        .replace(/\s+/g, " ")
        .trim();

      const datePosted = $card.find("time").first().attr("datetime")?.trim();
      const dateLabel = $card.find("time").first().text().replace(/\s+/g, " ").trim();
      const { location, workMode } = parseLocationAndWorkMode(locationText);
      const { applicantCount, applicantsLabel } = parseApplicantsFromCard($card, $);

      const companyLogoUrl =
        $card.find("img.artdeco-entity-image").first().attr("data-delayed-url")?.trim() ||
        $card.find("img").first().attr("data-delayed-url")?.trim() ||
        $card.find("img").first().attr("src")?.trim();

      jobs.push({
        id,
        linkedInJobId: linkedInNumericIdFromJobId(id) ?? id,
        title,
        company: company || "Unknown",
        url: linkedInJobViewUrl(id),
        location,
        workMode,
        datePosted,
        dateLabel: dateLabel || undefined,
        applicantCount,
        applicantsLabel,
        companyLogoUrl: companyLogoUrl || undefined,
      });
    }
  );

  return jobs;
}

export function diagnoseLinkedInSearchHtml(html: string): {
  jobCards: number;
  isEmpty: boolean;
  isBlocked: boolean;
} {
  const jobCards = (html.match(/data-entity-urn="urn:li:jobPosting:/g) ?? []).length;
  const isBlocked = html.includes("authwall") || html.includes("checkpoint/challenge");
  const isEmpty = html.trim().length < 50 || (!jobCards && !html.includes("base-search-card"));

  return { jobCards, isEmpty, isBlocked };
}
