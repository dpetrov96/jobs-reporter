import { getCountryFlag } from "../../shared/countries.js";
import type { JobCategoryResult, JobListing } from "../linkedin/types.js";
import type { CountryRunResult, JobReportMeta } from "./types.js";

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

function buildJobRow(job: JobListing, fallbackLocation: string): string {
  const location = job.location ?? fallbackLocation;
  const date = job.dateLabel ?? job.datePosted ?? "New";
  const mode = workModeLabel(job.workMode);
  const meta = [job.company, location, mode, date].filter(Boolean).join(" · ");

  return `
    <tr class="job-row">
      <td class="job-cell">
        <a href="${escapeHtml(job.url)}" class="job-title">${escapeHtml(job.title)}</a>
        <div class="job-meta">${escapeHtml(meta)}</div>
      </td>
    </tr>
  `.trim();
}

function buildCategorySection(
  category: JobCategoryResult,
  postedWithinLabel: string,
  fallbackLocation: string
): string {
  if (category.jobs.length === 0) {
    return "";
  }

  const rows = category.jobs.map((job) => buildJobRow(job, fallbackLocation)).join("\n");

  return `
    <tr>
      <td class="category-wrap">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="category-block">
          <tr>
            <td class="category-head">
              <span class="category-label">${escapeHtml(category.keyword)}</span>
              <span class="category-count">${category.jobs.length}</span>
            </td>
          </tr>
          ${rows}
        </table>
      </td>
    </tr>
  `.trim();
}

function buildCountrySection(country: CountryRunResult, postedWithinLabel: string): string {
  if (country.totalJobs === 0) {
    return "";
  }

  const categories = country.categories
    .map((category) => buildCategorySection(category, postedWithinLabel, country.code))
    .filter(Boolean)
    .join("\n");

  if (!categories) {
    return "";
  }

  return `
    <tr>
      <td class="country-wrap">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="country-shell">
          <tr>
            <td class="country-head">
              <span class="country-flag">${getCountryFlag(country.code, country.location)}</span>
              <span class="country-label">${escapeHtml(country.location)}</span>
              <span class="country-count">${country.totalJobs}</span>
            </td>
          </tr>
        </table>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          ${categories}
        </table>
      </td>
    </tr>
  `.trim();
}

const THEME_CSS = `
  :root { color-scheme: light dark; supported-color-schemes: light dark; }
  body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
  .email-bg { width: 100%; padding: 12px 10px; background: #09090b; }
  .email-shell { width: 100%; max-width: 620px; margin: 0 auto; }
  .summary-head { padding: 12px 14px; background: #18181b; border: 1px solid #3f3f46; border-radius: 12px; margin-bottom: 12px; }
  .summary-title { font-size: 14px; font-weight: 700; color: #fafafa; }
  .summary-meta { margin-top: 4px; font-size: 11px; color: #a1a1aa; }
  .country-wrap, .category-wrap { width: 100%; padding: 0 0 10px 0; }
  .country-shell, .category-block { width: 100%; border-collapse: separate; }
  .country-head { padding: 10px 12px; background: #111113; border: 1px solid #3f3f46; border-radius: 10px 10px 0 0; border-left: 3px solid #22c55e; }
  .country-flag { font-size: 15px; margin-right: 6px; }
  .country-label { font-size: 13px; font-weight: 700; color: #fafafa; }
  .country-count { display: inline-block; margin-left: 8px; padding: 1px 7px; font-size: 10px; color: #e4e4e7; background: #27272a; border: 1px solid #52525b; border-radius: 999px; }
  .category-head { padding: 8px 12px; background: #18181b; border: 1px solid #3f3f46; border-top: none; }
  .category-label { font-size: 12px; font-weight: 700; text-transform: lowercase; color: #e4e4e7; }
  .category-count { display: inline-block; margin-left: 6px; padding: 1px 6px; font-size: 10px; color: #d4d4d8; background: #27272a; border-radius: 999px; }
  .category-block { background: #111113; border: 1px solid #3f3f46; border-top: none; border-radius: 0 0 10px 10px; overflow: hidden; }
  .job-cell { padding: 8px 12px; border-top: 1px solid #27272a; vertical-align: top; }
  .job-title { display: block; font-size: 13px; font-weight: 600; color: #fff; text-decoration: none; line-height: 1.35; }
  .job-meta { margin-top: 2px; font-size: 10px; color: #a1a1aa; line-height: 1.35; }
  .empty-cell { padding: 14px; font-size: 12px; font-style: italic; color: #a1a1aa; text-align: center; }
  @media (prefers-color-scheme: light) {
    .email-bg { background: #f4f4f5 !important; }
    .summary-head, .country-head, .category-head { background: #fff !important; border-color: #e4e4e7 !important; }
    .summary-title, .country-label, .category-label { color: #18181b !important; }
    .summary-meta, .job-meta, .empty-cell { color: #71717a !important; }
    .country-count, .category-count { color: #52525b !important; background: #f4f4f5 !important; border-color: #d4d4d8 !important; }
    .category-block { background: #fff !important; border-color: #e4e4e7 !important; }
    .job-cell { border-top-color: #f4f4f5 !important; }
    .job-title { color: #09090b !important; }
    .country-head { border-left-color: #16a34a !important; }
  }
`.trim();

export function buildJobReportHtml(meta: JobReportMeta): string {
  const postedWithinLabel = meta.postedWithinLabel ?? "the selected period";
  const totalJobs = meta.countries.reduce((sum, country) => sum + country.totalJobs, 0);
  const activeCountries = meta.countries.filter((country) => country.totalJobs > 0).length;
  const sections = meta.countries
    .map((country) => buildCountrySection(country, postedWithinLabel))
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
    <meta name="color-scheme" content="light dark" />
    <style>${THEME_CSS}</style>
  </head>
  <body>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="email-bg">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="email-shell">
            <tr>
              <td class="summary-head">
                <div class="summary-title">${totalJobs} jobs · ${activeCountries} active countries</div>
                <div class="summary-meta">${escapeHtml(meta.location)} · ${escapeHtml(postedWithinLabel)}</div>
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
