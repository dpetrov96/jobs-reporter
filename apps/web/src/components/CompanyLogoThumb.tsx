function companyInitials(company?: string): string {
  const name = (company ?? "").trim();
  return (
    name
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("") || "?"
  );
}

const SIZE_CLASSES = {
  sm: "h-7 w-7 text-[9px]",
  md: "h-10 w-10 text-[11px]",
  lg: "h-12 w-12 text-xs",
} as const;

export function CompanyLogoThumb({
  company,
  logoUrl,
  url,
  size = "md",
  title,
}: {
  company: string;
  logoUrl?: string;
  url?: string;
  size?: keyof typeof SIZE_CLASSES;
  title?: string;
}) {
  const sizeClass = SIZE_CLASSES[size];
  const content = logoUrl ? (
    <img
      src={logoUrl}
      alt=""
      title={title ?? company}
      className={`${sizeClass} shrink-0 rounded object-cover bg-zinc-100`}
      loading="lazy"
    />
  ) : (
    <div
      title={title ?? company}
      className={`flex ${sizeClass} shrink-0 items-center justify-center rounded bg-zinc-100 font-semibold text-zinc-500`}
      aria-hidden
    >
      {companyInitials(company)}
    </div>
  );

  if (url) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="transition hover:opacity-80"
        title={title ?? company}
      >
        {content}
      </a>
    );
  }

  return content;
}
