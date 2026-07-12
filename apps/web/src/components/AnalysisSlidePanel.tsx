export type PresentationTone = "blue" | "violet" | "emerald" | "amber" | "zinc";

const TONE_ACCENT: Record<PresentationTone, string> = {
  blue: "border-t-[#0a66c2]",
  violet: "border-t-violet-500",
  emerald: "border-t-emerald-500",
  amber: "border-t-amber-500",
  zinc: "border-t-zinc-400",
};

export function AnalysisSlidePanel({
  children,
  className = "",
  id,
  tone = "zinc",
}: {
  children: React.ReactNode;
  className?: string;
  id?: string;
  tone?: PresentationTone;
}) {
  return (
    <section
      id={id}
      className={`scroll-mt-28 overflow-hidden rounded-2xl border border-zinc-200/90 border-t-[3px] bg-white shadow-sm ${TONE_ACCENT[tone]} ${className}`}
    >
      <div className="p-5 sm:p-6">{children}</div>
    </section>
  );
}
