import type { JobCategoryResult, JobListing } from "../linkedin/types.js";
import type { JobReportMeta } from "./types.js";

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

function companyAvatar(job: JobListing): string {
  const initials = escapeHtml(
    job.company
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("") || "?"
  );

  if (job.companyLogoUrl) {
    return `
      <img src="${escapeHtml(job.companyLogoUrl)}" alt="" width="28" height="28"
        class="logo" />
    `.trim();
  }

  return `<div class="logo-fallback">${initials}</div>`;
}

function buildJobRow(job: JobListing): string {
  const location = job.location ?? "BG";
  const date = job.dateLabel ?? job.datePosted ?? "New";
  const mode = workModeLabel(job.workMode);
  const meta = [job.company, location, mode, date].filter(Boolean).join(" · ");

  return `
    <tr class="job-row">
      <td class="job-cell job-cell-logo">
        ${companyAvatar(job)}
      </td>
      <td class="job-cell job-cell-body">
        <a href="${escapeHtml(job.url)}" class="job-title">${escapeHtml(job.title)}</a>
        <div class="job-meta">${escapeHtml(meta)}</div>
      </td>
    </tr>
  `.trim();
}

function buildCategorySection(category: JobCategoryResult, postedWithinLabel: string): string {
  const emptyMessage = `No jobs in ${postedWithinLabel}.`;

  const rows =
    category.jobs.length === 0
      ? `
        <tr>
          <td colspan="2" class="empty-cell">${escapeHtml(emptyMessage)}</td>
        </tr>
      `
      : category.jobs.map(buildJobRow).join("\n");

  return `
    <tr>
      <td class="section-wrap">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="category-shell">
          <tr>
            <td class="category-head" colspan="2">
              <span class="category-label">${escapeHtml(category.keyword)}</span>
              <span class="category-count">${category.jobs.length}</span>
            </td>
          </tr>
        </table>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="category-block">
          ${rows}
        </table>
      </td>
    </tr>
  `.trim();
}

const THEME_CSS = `
  :root {
    color-scheme: light dark;
    supported-color-schemes: light dark;
  }

  body {
    margin: 0;
    padding: 0;
    -webkit-text-size-adjust: 100%;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  }

  .email-bg {
    width: 100%;
    padding: 16px 12px;
    background: #09090b;
  }

  .email-shell {
    width: 100%;
    max-width: 640px;
    margin: 0 auto;
  }

  .section-wrap {
    width: 100%;
    padding: 0 0 14px 0;
  }

  .category-shell,
  .category-block {
    width: 100%;
    max-width: 100%;
    table-layout: fixed;
    border-collapse: separate;
  }

  .category-head {
    padding: 10px 14px;
    background: #18181b;
    border: 1px solid #3f3f46;
    border-bottom: none;
    border-radius: 12px 12px 0 0;
    border-left: 3px solid #818cf8;
  }

  .category-label {
    font-size: 13px;
    font-weight: 700;
    letter-spacing: 0.03em;
    text-transform: lowercase;
    color: #fafafa;
  }

  .category-count {
    display: inline-block;
    margin-left: 8px;
    padding: 1px 7px;
    font-size: 10px;
    font-weight: 600;
    line-height: 1.5;
    color: #e4e4e7;
    background: #27272a;
    border: 1px solid #52525b;
    border-radius: 999px;
    vertical-align: middle;
  }

  .category-block {
    background: #111113;
    border: 1px solid #3f3f46;
    border-top: none;
    border-radius: 0 0 12px 12px;
    overflow: hidden;
  }

  .job-cell {
    vertical-align: middle;
    border-top: 1px solid #27272a;
  }

  .job-cell-logo {
    width: 44px;
    padding: 10px 8px 10px 14px;
  }

  .job-cell-body {
    width: 100%;
    padding: 10px 14px 10px 4px;
  }

  .job-row:first-child .job-cell {
    border-top: none;
  }

  .job-title {
    display: block;
    font-size: 14px;
    line-height: 1.35;
    font-weight: 600;
    color: #ffffff;
    text-decoration: none;
  }

  .job-meta {
    margin-top: 3px;
    font-size: 11px;
    line-height: 1.4;
    color: #a1a1aa;
  }

  .empty-cell {
    padding: 14px 16px;
    font-size: 12px;
    font-style: italic;
    color: #a1a1aa;
    border-top: none;
  }

  .logo {
    display: block;
    width: 28px;
    height: 28px;
    border-radius: 8px;
    object-fit: cover;
    border: 1px solid #3f3f46;
    background: #18181b;
  }

  .logo-fallback {
    width: 28px;
    height: 28px;
    border-radius: 8px;
    background: #4f46e5;
    color: #ffffff;
    font-size: 10px;
    font-weight: 700;
    line-height: 28px;
    text-align: center;
  }

  @media (prefers-color-scheme: light) {
    .email-bg {
      background: #f4f4f5 !important;
    }

    .category-head {
      background: #ffffff !important;
      border-color: #e4e4e7 !important;
      border-left-color: #4f46e5 !important;
    }

    .category-label {
      color: #18181b !important;
    }

    .category-count {
      color: #52525b !important;
      background: #f4f4f5 !important;
      border-color: #d4d4d8 !important;
    }

    .category-block {
      background: #ffffff !important;
      border-color: #e4e4e7 !important;
    }

    .job-cell {
      border-top-color: #f4f4f5 !important;
    }

    .job-title {
      color: #09090b !important;
    }

    .job-meta,
    .empty-cell {
      color: #71717a !important;
    }

    .logo {
      border-color: #e4e4e7 !important;
      background: #ffffff !important;
    }

    .logo-fallback {
      background: #4f46e5 !important;
      color: #ffffff !important;
    }
  }

  @media (prefers-color-scheme: dark) {
    .email-bg {
      background: #09090b !important;
    }

    .category-head {
      background: #18181b !important;
      border-color: #3f3f46 !important;
      border-left-color: #818cf8 !important;
    }

    .category-label {
      color: #fafafa !important;
    }

    .category-count {
      color: #e4e4e7 !important;
      background: #27272a !important;
      border-color: #52525b !important;
    }

    .category-block {
      background: #111113 !important;
      border-color: #3f3f46 !important;
    }

    .job-cell {
      border-top-color: #27272a !important;
    }

    .job-title {
      color: #ffffff !important;
    }

    .job-meta,
    .empty-cell {
      color: #a1a1aa !important;
    }

    .logo {
      border-color: #3f3f46 !important;
      background: #18181b !important;
    }

    .logo-fallback {
      background: #4f46e5 !important;
      color: #ffffff !important;
    }
  }
`.trim();

export function buildJobReportHtml(meta: JobReportMeta): string {
  const postedWithinLabel = meta.postedWithinLabel ?? "the selected period";
  const sections = meta.categories
    .map((category) => buildCategorySection(category, postedWithinLabel))
    .join("\n");

  return `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="color-scheme" content="light dark" />
    <meta name="supported-color-schemes" content="light dark" />
    <style>${THEME_CSS}</style>
  </head>
  <body>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="email-bg">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="email-shell">
            ${sections}
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
  `.trim();
}
