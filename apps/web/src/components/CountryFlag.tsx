import { getCountryFlag } from "@jobs-reporter/shared";

const sizeClasses = {
  sm: "text-base leading-none",
  md: "text-xl leading-none",
  lg: "text-2xl leading-none",
} as const;

export function CountryFlag({
  code,
  location,
  flag,
  size = "md",
  className = "",
}: {
  code?: string;
  location?: string;
  flag?: string;
  size?: keyof typeof sizeClasses;
  className?: string;
}) {
  const emoji = flag && flag !== "🌍" ? flag : getCountryFlag(code, location);

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center ${sizeClasses[size]} ${className}`}
      role="img"
      aria-label={location ?? code ?? "Country"}
      title={location ?? code}
    >
      {emoji}
    </span>
  );
}
