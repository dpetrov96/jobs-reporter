import { encodeAnalysisId } from "@jobs-reporter/shared";

export interface CompanyLinkMeta {
  href: string;
  domain: string;
  label: string;
}

export function getCompanyLinkMeta(url?: string): CompanyLinkMeta | null {
  if (!url?.trim()) return null;

  try {
    const parsed = new URL(url);
    const domain = parsed.hostname.replace(/^www\./i, "");
    const label =
      domain === "linkedin.com" || domain === "www.linkedin.com"
        ? "LinkedIn"
        : domain;

    return { href: url, domain, label };
  } catch {
    return null;
  }
}

export function getCompanyWebsiteHref(domain?: string): string | null {
  if (!domain?.trim()) return null;
  const clean = domain.replace(/^https?:\/\//i, "").replace(/\/.*$/, "").replace(/^www\./i, "");
  if (!clean) return null;
  return `https://${clean}`;
}

export function getCompanyWebsiteMeta(domain?: string): CompanyLinkMeta | null {
  const href = getCompanyWebsiteHref(domain);
  if (!href) return null;

  const hostname = href.replace(/^https:\/\//i, "");
  return {
    href,
    domain: hostname,
    label: hostname,
  };
}

export function companiesPagePath(analysisId: string, countryCode?: string): string {
  const base = `/analyses/${encodeAnalysisId(analysisId)}/companies`;
  if (!countryCode) return base;
  return `${base}/${countryCode.toUpperCase()}`;
}
