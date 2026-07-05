import { getCountryFlag, sortByCountryDisplayOrder } from "../../shared/countries.js";
import { formatApplicants, isJobFreshWithinMinutes } from "../linkedin/jobTime.js";
import type { JobListing } from "../linkedin/types.js";
import type { CountryRunResult, JobReportMeta } from "./types.js";
import { groupJobsByCompany } from "./groupByCompany.js";

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
    ? `<span class="job-keyword">${escapeHtml(job.keyword)}</span>`
    : "";

  return `
    <tr class="job-row">
      <td class="job-cell">
        <a href="${escapeHtml(job.url)}" class="job-title">${escapeHtml(job.title)}</a>
        <div class="job-meta">${buildJobMetaHtml(job, fallbackLocation)}</div>
      </td>
      <td class="job-keyword-cell">${keyword}</td>
    </tr>
  `.trim();
}

function buildCompanySection(group: ReturnType<typeof groupJobsByCompany>[number], fallbackLocation: string): string {
  const rows = group.jobs.map((job) => buildJobRow(job, fallbackLocation)).join("\n");
  const openingsLabel = group.jobs.length === 1 ? "opening" : "openings";

  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="company-block">
      <tr>
        <td class="company-head" colspan="2">
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

function buildCountrySection(country: CountryRunResult): string {
  const companyGroups = groupJobsByCompany(country.categories);

  if (country.totalJobs === 0 || companyGroups.length === 0) {
    return "";
  }

  const countryLabel =
    country.code === "GB" ? "United Kingdom" : country.location;
  const flag = getCountryFlag(country.code, country.location);
  const companies = companyGroups
    .map((group) => buildCompanySection(group, country.code))
    .join("\n");

  return `
    <tr>
      <td class="country-wrap">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="country-block">
          <tr>
            <td class="country-head">
              <span class="country-flag">${flag}</span>
              <span class="country-label">${escapeHtml(countryLabel)}</span>
              <span class="country-count">${country.totalJobs}</span>
            </td>
          </tr>
          <tr>
            <td class="country-body">
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
  .email-bg { width: 100%; padding: 12px 10px; background: #fff; }
  .email-shell { width: 100%; max-width: 640px; margin: 0 auto; }
  .summary-head { padding: 8px 12px; background: #fafafa; border: 1px solid #e4e4e7; border-radius: 8px; margin-bottom: 12px; font-size: 12px; line-height: 1.45; color: #52525b; }
  .summary-strong { font-weight: 600; color: #18181b; }
  .country-wrap { width: 100%; padding: 0 0 12px 0; }
  .country-block { width: 100%; border: 1px solid #e4e4e7; border-radius: 10px; overflow: hidden; border-collapse: separate; }
  .country-head { padding: 10px 12px; background: #fafafa; border-bottom: 1px solid #f4f4f5; }
  .country-flag { font-size: 15px; margin-right: 6px; vertical-align: middle; }
  .country-label { font-size: 14px; font-weight: 600; color: #18181b; vertical-align: middle; }
  .country-count { display: inline-block; margin-left: 8px; padding: 2px 8px; font-size: 11px; font-weight: 600; color: #fff; background: #18181b; border-radius: 6px; vertical-align: middle; }
  .country-body { padding: 0; background: #fff; }
  .company-block { width: 100%; border-collapse: collapse; border-top: 1px solid #f4f4f5; }
  .company-block:first-child { border-top: none; }
  .company-head { padding: 10px 12px; background: rgba(250,250,250,0.8); border-bottom: 1px solid #f4f4f5; }
  .company-logo-cell { width: 40px; padding-right: 12px; vertical-align: middle; }
  .company-logo { display: block; width: 40px; height: 40px; border-radius: 4px; object-fit: cover; background: #f4f4f5; }
  .company-initials { width: 40px; height: 40px; line-height: 40px; text-align: center; font-size: 11px; font-weight: 600; color: #71717a; background: #f4f4f5; border-radius: 4px; }
  .company-name { font-size: 14px; font-weight: 600; color: #18181b; line-height: 1.3; }
  .company-count { margin-top: 2px; font-size: 12px; color: #71717a; }
  .job-cell { padding: 8px 8px 8px 52px; border-top: 1px solid #f4f4f5; vertical-align: top; }
  .job-keyword-cell { padding: 8px 12px 8px 0; border-top: 1px solid #f4f4f5; vertical-align: top; width: 1%; white-space: nowrap; }
  .job-title { display: block; font-size: 14px; font-weight: 500; color: #18181b; text-decoration: none; line-height: 1.35; }
  .job-meta { margin-top: 2px; font-size: 12px; color: #71717a; line-height: 1.35; }
  .job-date-fresh { color: #059669; font-weight: 600; }
  .job-keyword { display: inline-block; padding: 2px 6px; font-size: 10px; font-weight: 500; color: #71717a; background: #f4f4f5; border-radius: 4px; }
  .empty-cell { padding: 14px; font-size: 13px; font-style: italic; color: #71717a; text-align: center; }
`.trim();

export function buildJobReportHtml(meta: JobReportMeta): string {
  const postedWithinLabel = meta.postedWithinLabel ?? "the selected period";
  const totalJobs = meta.countries.reduce((sum, country) => sum + country.totalJobs, 0);
  const countriesWithJobs = meta.countries.filter((country) => country.totalJobs > 0).length;
  const sortedCountries = sortByCountryDisplayOrder(meta.countries);
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
            ${body}
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
  `.trim();
}
