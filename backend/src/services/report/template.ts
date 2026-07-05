import { getCountryFlag, sortByCountryDisplayOrder } from "../../shared/countries.js";
import { formatApplicants, isJobFreshWithinMinutes } from "../linkedin/jobTime.js";
import type { JobListing } from "../linkedin/types.js";
import type { CountryRunResult, JobReportMeta } from "./types.js";
import { groupJobsByCompany } from "./groupByCompany.js";
import { formatKeywordBadge } from "./keywordLabel.js";

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function workModeLabel(workMode?: JobListing["workMode"]): string {
  if (!workMode) return "";
  if (workMode === "remote") return "Remote";
  if (workMode === "hybrid") return "Hybrid";
  return "On-site";
}

function companyInitials(company: string): string {
  return (
    company
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("") || "?"
  );
}

function formatRunWhen(iso: string): string {
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

function humanizePostedWithin(label: string): string {
  const value = label.trim();
  if (!value) return "Recent";
  if (/^the last hour$/i.test(value)) return "Last hour";
  if (/^the last 24 hours$/i.test(value)) return "Last 24 hours";
  if (/^the last 7 days$/i.test(value)) return "Last 7 days";
  return value.replace(/^the /i, "").replace(/^\w/, (char) => char.toUpperCase());
}

function countryDisplayName(country: CountryRunResult): string {
  return country.code === "GB" ? "United Kingdom" : country.location;
}

function formatJobDateHtml(job: JobListing): string {
  const date = job.dateLabel ?? job.datePosted ?? "Recently";
  const escaped = escapeHtml(date);
  return isJobFreshWithinMinutes(job, 15)
    ? `<span class="job-date-fresh">${escaped}</span>`
    : escaped;
}

function buildJobMetaHtml(job: JobListing, fallbackLocation: string): string {
  const location = job.location ?? fallbackLocation;
  const mode = workModeLabel(job.workMode);
  const applicants = formatApplicants(job);
  const parts = [
    escapeHtml(location),
    applicants ? escapeHtml(applicants) : "",
    formatJobDateHtml(job),
    mode ? escapeHtml(mode) : "",
  ].filter(Boolean);

  return parts.join(" · ");
}

function buildCompanyLogoHtml(group: { company: string; logoUrl?: string }): string {
  if (group.logoUrl) {
    return `<img src="${escapeHtml(group.logoUrl)}" alt="" width="40" height="40" class="company-logo" />`;
  }

  return `<div class="company-initials">${escapeHtml(companyInitials(group.company))}</div>`;
}

function buildJobRow(job: JobListing, fallbackLocation: string): string {
  const keyword = job.keyword
    ? `<span class="job-keyword">${escapeHtml(formatKeywordBadge(job.keyword))}</span>`
    : "";

  return `
    <tr class="job-row">
      <td class="job-cell">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td class="job-title-cell">
              <a href="${escapeHtml(job.url)}" class="job-title">${escapeHtml(job.title)}</a>
            </td>
            <td class="job-keyword-cell">${keyword}</td>
          </tr>
          <tr>
            <td colspan="2" class="job-meta-cell">
              <div class="job-meta">${buildJobMetaHtml(job, fallbackLocation)}</div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  `.trim();
}

function buildCompanySection(
  group: ReturnType<typeof groupJobsByCompany>[number],
  fallbackLocation: string
): string {
  const rows = group.jobs.map((job) => buildJobRow(job, fallbackLocation)).join("\n");
  const openingsLabel = group.jobs.length === 1 ? "opening" : "openings";

  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="company-block">
      <tr>
        <td class="company-head">
          <table role="presentation" cellpadding="0" cellspacing="0">
            <tr>
              <td class="company-logo-cell">${buildCompanyLogoHtml(group)}</td>
              <td class="company-info-cell">
                <div class="company-name">${escapeHtml(group.company)}</div>
                <div class="company-count">${group.jobs.length} ${openingsLabel}</div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
      ${rows}
    </table>
  `.trim();
}

function buildCountryPill(country: CountryRunResult): string {
  const flag = getCountryFlag(country.code, country.location);
  const label = countryDisplayName(country);
  const badgeClass = country.totalJobs > 0 ? "country-badge country-badge-active" : "country-badge";

  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="country-pill">
      <tr>
        <td class="country-pill-inner">
          <span class="country-flag">${flag}</span>
          <span class="country-label">${escapeHtml(label)}</span>
          <span class="${badgeClass}">${country.totalJobs}</span>
        </td>
      </tr>
    </table>
  `.trim();
}

function buildCountrySection(country: CountryRunResult): string {
  const companyGroups = groupJobsByCompany(country.categories);

  if (country.totalJobs === 0 || companyGroups.length === 0) {
    return "";
  }

  const companies = companyGroups
    .map((group) => buildCompanySection(group, country.code))
    .join("\n");

  return `
    <tr>
      <td class="country-section">
        ${buildCountryPill(country)}
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="country-jobs">
          <tr>
            <td class="country-jobs-inner">
              ${companies}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  `.trim();
}

const THEME_CSS = `
  body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #fff; color: #18181b; }
  .email-bg { width: 100%; padding: 16px 12px; background: #fff; }
  .email-shell { width: 100%; max-width: 640px; margin: 0 auto; }
  .summary-head { padding: 8px 12px; background: #fafafa; border: 1px solid #e4e4e7; border-radius: 8px; font-size: 12px; line-height: 1.45; color: #52525b; }
  .summary-strong { font-weight: 600; color: #18181b; }
  .countries-section { padding: 14px 2px 8px; }
  .countries-title { font-size: 13px; font-weight: 500; color: #27272a; }
  .countries-meta { font-size: 12px; color: #a1a1aa; white-space: nowrap; }
  .country-section { padding: 0 0 18px 0; }
  .country-pill { margin-bottom: 0; }
  .country-pill-inner { padding: 10px 14px; background: #fff; border: 1px solid rgba(228,228,231,0.8); border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04); }
  .country-flag { font-size: 16px; margin-right: 8px; vertical-align: middle; }
  .country-label { font-size: 14px; font-weight: 500; color: #18181b; vertical-align: middle; }
  .country-badge { display: inline-block; margin-left: 8px; min-width: 20px; padding: 3px 8px; font-size: 11px; font-weight: 600; text-align: center; color: #71717a; background: #e4e4e7; border-radius: 6px; vertical-align: middle; }
  .country-badge-active { color: #fff; background: #18181b; }
  .country-jobs-inner { padding-top: 0; border-top: none; }
  .company-block { width: 100%; border-collapse: collapse; border-top: 1px solid #e4e4e7; }
  .company-head { padding: 10px 8px; background: rgba(250,250,250,0.8); border-bottom: 1px solid #f4f4f5; }
  .company-logo-cell { width: 40px; padding-right: 12px; vertical-align: middle; }
  .company-logo { display: block; width: 40px; height: 40px; border-radius: 4px; object-fit: cover; background: #f4f4f5; }
  .company-initials { width: 40px; height: 40px; line-height: 40px; text-align: center; font-size: 11px; font-weight: 600; color: #71717a; background: #f4f4f5; border-radius: 4px; }
  .company-name { font-size: 14px; font-weight: 600; color: #18181b; line-height: 1.3; }
  .company-count { margin-top: 2px; font-size: 12px; color: #71717a; }
  .job-row { border-top: 1px solid #f4f4f5; }
  .job-cell { padding: 8px 8px 8px 52px; vertical-align: top; }
  .job-title-cell { vertical-align: top; }
  .job-title { font-size: 14px; font-weight: 500; color: #18181b; text-decoration: none; line-height: 1.35; }
  .job-keyword-cell { vertical-align: top; width: 1%; white-space: nowrap; padding-left: 8px; text-align: right; }
  .job-meta-cell { padding-top: 2px; }
  .job-meta { font-size: 12px; color: #71717a; line-height: 1.35; }
  .job-date-fresh { color: #059669; font-weight: 600; }
  .job-keyword { display: inline-block; padding: 2px 6px; font-size: 10px; font-weight: 500; color: #71717a; background: #f4f4f5; border-radius: 4px; white-space: nowrap; }
  .empty-cell { padding: 14px; font-size: 13px; font-style: italic; color: #71717a; text-align: center; }
`.trim();

export function buildJobReportHtml(meta: JobReportMeta): string {
  const postedWithinLabel = meta.postedWithinLabel ?? "the selected period";
  const totalJobs = meta.countries.reduce((sum, country) => sum + country.totalJobs, 0);
  const sortedCountries = sortByCountryDisplayOrder(meta.countries);
  const countriesWithJobs = sortedCountries.filter((country) => country.totalJobs > 0).length;
  const when = meta.fetchedAt ? formatRunWhen(meta.fetchedAt) : "Recently";
  const period = humanizePostedWithin(postedWithinLabel);

  const sections = sortedCountries
    .map((country) => buildCountrySection(country))
    .filter(Boolean)
    .join("\n");

  const body = sections || `
    <tr>
      <td class="empty-cell">No jobs in ${escapeHtml(postedWithinLabel)} across ${meta.countries.length} countries.</td>
    </tr>
  `;

  const countriesLabel = sections
    ? `
    <tr>
      <td class="countries-section">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td class="countries-title">Countries</td>
            <td align="right" class="countries-meta">${countriesWithJobs}/${sortedCountries.length} with jobs</td>
          </tr>
        </table>
      </td>
    </tr>
  `
    : "";

  return `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <style>${THEME_CSS}</style>
  </head>
  <body>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="email-bg">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="email-shell">
            <tr>
              <td class="summary-head">
                <span class="summary-strong">${escapeHtml(when)}</span>
                · ${escapeHtml(period)}
                · <span class="summary-strong">${totalJobs}</span> jobs
                · <span class="summary-strong">${countriesWithJobs}</span>/${sortedCountries.length} countries
              </td>
            </tr>
            ${countriesLabel}
            ${body}
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
  `.trim();
}
