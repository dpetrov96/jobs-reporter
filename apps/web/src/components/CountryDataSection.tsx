import type { PresentationTone } from "./PresentationHeader";
import { PresentationCardHeader } from "./PresentationHeader";

export function CountryDataSection({
  title,
  subtitle,
  children,
  className = "",
  tone = "zinc",
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
  tone?: PresentationTone;
}) {
  return (
    <div
      className={`overflow-hidden rounded-xl border border-zinc-200/80 bg-white shadow-sm ${className}`}
    >
      <div className="p-4 sm:p-5">
        <PresentationCardHeader title={title} subtitle={subtitle} tone={tone} />
        {children}
      </div>
    </div>
  );
}
