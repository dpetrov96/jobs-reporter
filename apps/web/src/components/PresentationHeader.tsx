export type PresentationTone = "blue" | "violet" | "emerald" | "amber" | "zinc";

const TONE = {
  blue: {
    bar: "from-[#0a66c2] via-blue-500 to-sky-400",
    kicker: "bg-blue-50 text-blue-700 ring-blue-100",
    accent: "bg-[#0a66c2]",
    label: "text-blue-600",
  },
  violet: {
    bar: "from-violet-600 via-violet-500 to-purple-400",
    kicker: "bg-violet-50 text-violet-700 ring-violet-100",
    accent: "bg-violet-500",
    label: "text-violet-600",
  },
  emerald: {
    bar: "from-emerald-600 via-emerald-500 to-teal-400",
    kicker: "bg-emerald-50 text-emerald-700 ring-emerald-100",
    accent: "bg-emerald-500",
    label: "text-emerald-600",
  },
  amber: {
    bar: "from-amber-500 via-amber-400 to-yellow-400",
    kicker: "bg-amber-50 text-amber-800 ring-amber-100",
    accent: "bg-amber-500",
    label: "text-amber-700",
  },
  zinc: {
    bar: "from-zinc-700 via-zinc-500 to-zinc-400",
    kicker: "bg-zinc-100 text-zinc-700 ring-zinc-200",
    accent: "bg-zinc-500",
    label: "text-zinc-500",
  },
} as const;

/** Main slide section — AI, markets, page-level blocks */
export function AnalysisSlideHeader({
  kicker,
  title,
  subtitle,
  tone = "blue",
  icon,
  step,
}: {
  kicker: string;
  title: string;
  subtitle?: string;
  tone?: PresentationTone;
  icon?: string;
  step?: string;
}) {
  const colors = TONE[tone];

  return (
    <header className="scroll-mt-28">
      <div className={`h-1 rounded-full bg-gradient-to-r ${colors.bar}`} aria-hidden />
      <div className="mt-4 flex items-start gap-3 sm:gap-4">
        {step ? (
          <span
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xs font-bold tabular-nums text-white shadow-sm ${colors.accent}`}
          >
            {step}
          </span>
        ) : icon ? (
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-zinc-100 text-lg ring-1 ring-zinc-200">
            {icon}
          </span>
        ) : null}
        <div className="min-w-0 flex-1">
          <span
            className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest ring-1 ${colors.kicker}`}
          >
            {kicker}
          </span>
          <h2 className="mt-2 text-base font-semibold leading-snug text-zinc-900 sm:text-lg">
            {title}
          </h2>
          {subtitle ? (
            <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-zinc-500">{subtitle}</p>
          ) : null}
        </div>
      </div>
      <div className="mt-6 flex items-center gap-3" aria-hidden>
        <div className={`h-1 w-10 shrink-0 rounded-full ${colors.accent}`} />
        <div className={`h-px flex-1 bg-gradient-to-r ${colors.bar} opacity-25`} />
      </div>
    </header>
  );
}

/** Group inside a slide — e.g. job opening times block */
export function PresentationBlockHeader({
  kicker,
  title,
  subtitle,
  tone = "zinc",
}: {
  kicker: string;
  title: string;
  subtitle?: string;
  tone?: PresentationTone;
}) {
  const colors = TONE[tone];

  return (
    <header className="mb-4 rounded-xl bg-zinc-50 px-4 py-3 ring-1 ring-zinc-200/60">
      <div className="flex items-start gap-3">
        <span className={`mt-1 h-8 w-1 shrink-0 rounded-full ${colors.accent}`} aria-hidden />
        <div>
          <p className={`text-[10px] font-bold uppercase tracking-widest ${colors.label}`}>
            {kicker}
          </p>
          <h4 className="mt-0.5 text-sm font-semibold text-zinc-900">{title}</h4>
          {subtitle ? <p className="mt-1 text-xs leading-relaxed text-zinc-500">{subtitle}</p> : null}
        </div>
      </div>
    </header>
  );
}

/** Card-level subsection — employers, roles, heatmap */
export function PresentationCardHeader({
  title,
  subtitle,
  tone = "zinc",
}: {
  title: string;
  subtitle?: string;
  tone?: PresentationTone;
}) {
  const colors = TONE[tone];

  return (
    <header className="mb-4 flex items-start gap-2.5 border-b border-zinc-100 pb-3">
      <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${colors.accent}`} aria-hidden />
      <div className="min-w-0">
        <h4 className="text-xs font-semibold uppercase tracking-widest text-zinc-800">{title}</h4>
        {subtitle ? <p className="mt-1 text-[11px] leading-relaxed text-zinc-500">{subtitle}</p> : null}
      </div>
    </header>
  );
}

/** Country slide header */
export function PresentationCountryHeader({
  code,
  location,
  flag,
  totalJobs,
  children,
}: {
  code: string;
  location: string;
  flag: string;
  totalJobs: number;
  children?: React.ReactNode;
}) {
  return (
    <header className="border-b border-zinc-200 bg-gradient-to-r from-white via-white to-emerald-50/40 px-5 py-5 sm:px-6">
      <div className="flex flex-wrap items-start gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white text-2xl shadow-sm ring-1 ring-zinc-200/80">
          {flag}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-emerald-700 ring-1 ring-emerald-100">
              Market · {code}
            </span>
          </div>
          <h3 className="mt-2 text-xl font-semibold tracking-tight text-zinc-900">{location}</h3>
          <p className="mt-1 text-sm text-zinc-500">
            <span className="font-semibold tabular-nums text-zinc-800">
              {totalJobs.toLocaleString()}
            </span>{" "}
            unique job listings in this period
          </p>
        </div>
      </div>
      {children ? <div className="mt-4">{children}</div> : null}
    </header>
  );
}
