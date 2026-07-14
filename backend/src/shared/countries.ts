export interface JobCountry {
  location: string;
  geoId: string;
  flag: string;
  code: string;
}

export const JOB_COUNTRY_REGISTRY: JobCountry[] = [
  { code: "BG", location: "Bulgaria", geoId: "105333783", flag: "🇧🇬" },
  { code: "RO", location: "Romania", geoId: "106670623", flag: "🇷🇴" },
  { code: "GR", location: "Greece", geoId: "104677530", flag: "🇬🇷" },
  { code: "HR", location: "Croatia", geoId: "104688944", flag: "🇭🇷" },
  { code: "RS", location: "Serbia", geoId: "101855366", flag: "🇷🇸" },
  { code: "DE", location: "Germany", geoId: "101282230", flag: "🇩🇪" },
  { code: "GB", location: "United Kingdom", geoId: "101165590", flag: "🇬🇧" },
  { code: "FR", location: "France", geoId: "105015875", flag: "🇫🇷" },
  { code: "NL", location: "Netherlands", geoId: "102890719", flag: "🇳🇱" },
  { code: "ES", location: "Spain", geoId: "105646813", flag: "🇪🇸" },
  { code: "IT", location: "Italy", geoId: "103350119", flag: "🇮🇹" },
  { code: "PL", location: "Poland", geoId: "105072130", flag: "🇵🇱" },
  { code: "PT", location: "Portugal", geoId: "100364837", flag: "🇵🇹" },
  { code: "AT", location: "Austria", geoId: "103883259", flag: "🇦🇹" },
  { code: "CH", location: "Switzerland", geoId: "106693272", flag: "🇨🇭" },
  { code: "CZ", location: "Czech Republic", geoId: "104508036", flag: "🇨🇿" },
  { code: "HU", location: "Hungary", geoId: "100288700", flag: "🇭🇺" },
  { code: "IE", location: "Ireland", geoId: "104738515", flag: "🇮🇪" },
  { code: "BE", location: "Belgium", geoId: "100565514", flag: "🇧🇪" },
  { code: "SE", location: "Sweden", geoId: "105117694", flag: "🇸🇪" },
  { code: "DK", location: "Denmark", geoId: "104514075", flag: "🇩🇰" },
  { code: "NO", location: "Norway", geoId: "103819153", flag: "🇳🇴" },
  { code: "FI", location: "Finland", geoId: "100456013", flag: "🇫🇮" },
  { code: "SK", location: "Slovakia", geoId: "106155005", flag: "🇸🇰" },
  { code: "SI", location: "Slovenia", geoId: "106137510", flag: "🇸🇮" },
  { code: "LT", location: "Lithuania", geoId: "101464403", flag: "🇱🇹" },
  { code: "LV", location: "Latvia", geoId: "104341318", flag: "🇱🇻" },
  { code: "EE", location: "Estonia", geoId: "102158813", flag: "🇪🇪" },
  { code: "TR", location: "Turkey", geoId: "102105699", flag: "🇹🇷" },
  { code: "UA", location: "Ukraine", geoId: "102264497", flag: "🇺🇦" },
  { code: "US", location: "United States", geoId: "103644278", flag: "🇺🇸" },
];

/** Active fetch targets — display order: BG, FR, DE, NL, UK, BE, PL */
export const COUNTRY_DISPLAY_ORDER = ["BG", "FR", "DE", "NL", "GB", "BE", "PL"] as const;

export const DEFAULT_JOB_COUNTRIES = "BG,FR,DE,NL,GB,BE,PL";

const displayOrderIndex = new Map<string, number>(
  COUNTRY_DISPLAY_ORDER.map((code, index) => [code, index]),
);

export function sortByCountryDisplayOrder<T extends { code: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const ai = displayOrderIndex.get(a.code) ?? 999;
    const bi = displayOrderIndex.get(b.code) ?? 999;
    if (ai !== bi) return ai - bi;
    return a.code.localeCompare(b.code);
  });
}

const registryByKey = new Map(
  JOB_COUNTRY_REGISTRY.flatMap((country) => [
    [country.code.toLowerCase(), country],
    [country.location.toLowerCase(), country],
    ...(country.code === "GB" ? ([["uk", country]] as const) : []),
  ])
);

export function lookupCountry(codeOrLocation?: string): JobCountry | undefined {
  if (!codeOrLocation) return undefined;
  return registryByKey.get(codeOrLocation.trim().toLowerCase());
}

export function getCountryFlag(codeOrLocation?: string, fallbackLocation?: string): string {
  const country =
    lookupCountry(codeOrLocation) ?? lookupCountry(fallbackLocation);
  return country?.flag ?? "🌍";
}

export function enrichCountryRun<T extends { code: string; location: string; flag?: string }>(
  country: T
): T & { flag: string } {
  return {
    ...country,
    flag: country.flag && country.flag !== "🌍" ? country.flag : getCountryFlag(country.code, country.location),
  };
}

export function summarizeCountries(countries: Array<{ location: string }>): string {
  if (countries.length <= 3) {
    return countries.map((country) => country.location).join(", ");
  }

  return `${countries.length} countries`;
}

export function parseJobCountries(raw: string): JobCountry[] {
  const value = raw.trim();
  if (!value || value.toLowerCase() === "all") {
    return JOB_COUNTRY_REGISTRY;
  }

  const selected: JobCountry[] = [];
  const seen = new Set<string>();

  for (const token of value.split(",")) {
    const key = token.trim().toLowerCase();
    if (!key) continue;

    const country = registryByKey.get(key);
    if (!country || seen.has(country.code)) continue;

    seen.add(country.code);
    selected.push(country);
  }

  return selected.length > 0 ? selected : parseJobCountries(DEFAULT_JOB_COUNTRIES);
}
