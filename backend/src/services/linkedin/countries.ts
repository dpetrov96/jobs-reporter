export type { JobCountry } from "../../shared/countries.js";
export {
  DEFAULT_JOB_COUNTRIES,
  JOB_COUNTRY_REGISTRY,
  getCountryFlag,
  lookupCountry,
  enrichCountryRun,
  summarizeCountries,
  parseJobCountries,
} from "../../shared/countries.js";

import { DEFAULT_JOB_COUNTRIES, parseJobCountries } from "../../shared/countries.js";

export function resolveJobCountries(raw?: string) {
  const value = raw?.trim() || process.env.JOB_COUNTRIES?.trim() || DEFAULT_JOB_COUNTRIES;
  return parseJobCountries(value);
}
