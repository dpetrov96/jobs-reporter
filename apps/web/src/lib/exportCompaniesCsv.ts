import type { CompanyHiringItem } from "@jobs-reporter/shared";

function escapeCsvCell(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function buildCompaniesCsv(companies: CompanyHiringItem[]): string {
  const lines = [["Name", "Domain"].map(escapeCsvCell).join(",")];

  for (const company of companies) {
    lines.push([company.name, company.domain?.trim() ?? ""].map(escapeCsvCell).join(","));
  }

  return lines.join("\n");
}

export function downloadCompaniesCsv(companies: CompanyHiringItem[], filename: string): void {
  const csv = buildCompaniesCsv(companies);
  const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function buildCompaniesExportFilename(options: {
  countryCode?: string;
  periodStart: string;
  periodEnd: string;
  withDomainOnly?: boolean;
}): string {
  const start = options.periodStart.slice(0, 10);
  const end = options.periodEnd.slice(0, 10);
  const market = options.countryCode?.toLowerCase() ?? "all-markets";
  const suffix = options.withDomainOnly ? "-with-domain" : "";
  return `companies-${market}-${start}-to-${end}${suffix}.csv`;
}
