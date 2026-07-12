import type { AnalysisRecord, CompanyCountryStat, CompanyHiringItem } from "@jobs-reporter/shared";

function upsertCountryStat(
  stats: CompanyCountryStat[],
  code: string,
  count: number
): CompanyCountryStat[] {
  const existing = stats.find((entry) => entry.code === code);
  if (existing) {
    existing.count += count;
    return stats;
  }

  return [...stats, { code, count }];
}

export function mergeTopCompaniesFallback(analysis: AnalysisRecord): CompanyHiringItem[] {
  const merged = new Map<string, CompanyHiringItem>();

  for (const country of analysis.countries ?? []) {
    for (const company of country.topCompanies ?? []) {
      const key = company.name.trim().toLowerCase();
      const existing = merged.get(key);
      if (existing) {
        existing.count += company.count;
        existing.countries = upsertCountryStat(
          existing.countries ?? [],
          country.code,
          company.count
        );
      } else {
        merged.set(key, {
          ...company,
          countries: [{ code: country.code, count: company.count }],
        });
      }
    }
  }

  return [...merged.values()]
    .map((company) => ({
      ...company,
      countries: company.countries?.sort(
        (a, b) => b.count - a.count || a.code.localeCompare(b.code)
      ),
    }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

export function getAnalysisCompanies(analysis: AnalysisRecord): CompanyHiringItem[] {
  if (analysis.globalCompanies && analysis.globalCompanies.length > 0) {
    return analysis.globalCompanies;
  }

  return mergeTopCompaniesFallback(analysis);
}

export function getAnalysisCompanyCount(analysis: AnalysisRecord): number {
  return analysis.uniqueCompanies ?? getAnalysisCompanies(analysis).length;
}

export function buildCountryLabelMap(analysis: AnalysisRecord): Map<string, string> {
  const map = new Map<string, string>();

  for (const country of analysis.countries ?? []) {
    map.set(country.code, country.location);
  }

  return map;
}

export function filterCompaniesByCountry(
  companies: CompanyHiringItem[],
  countryCode?: string
): CompanyHiringItem[] {
  if (!countryCode) {
    return companies;
  }

  const code = countryCode.toUpperCase();

  return companies
    .filter((company) => company.countries?.some((entry) => entry.code === code))
    .map((company) => ({
      ...company,
      count: company.countries?.find((entry) => entry.code === code)?.count ?? company.count,
    }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

export function countMissingDomains(companies: CompanyHiringItem[]): number {
  return companies.filter((company) => !company.domain?.trim()).length;
}

export function countMissingDomainsByCountry(
  companies: CompanyHiringItem[],
  countryCode: string
): number {
  return countMissingDomains(filterCompaniesByCountry(companies, countryCode));
}

export function buildMissingDomainsByCountry(
  companies: CompanyHiringItem[],
  countryCodes: string[]
): Map<string, number> {
  const map = new Map<string, number>();

  for (const code of countryCodes) {
    const missing = countMissingDomainsByCountry(companies, code);
    if (missing > 0) {
      map.set(code, missing);
    }
  }

  return map;
}

export function getCompanyCountryOptions(analysis: AnalysisRecord) {
  return (analysis.countries ?? []).map((country) => ({
    code: country.code,
    location: country.location,
    flag: country.flag,
  }));
}
