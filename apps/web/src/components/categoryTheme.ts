export const CATEGORY_THEMES = [
  {
    border: "border-l-emerald-500",
    bg: "bg-emerald-50/50",
    ring: "ring-emerald-100",
    title: "text-emerald-900",
    badge: "bg-emerald-100 text-emerald-800",
  },
  {
    border: "border-l-violet-500",
    bg: "bg-violet-50/50",
    ring: "ring-violet-100",
    title: "text-violet-900",
    badge: "bg-violet-100 text-violet-800",
  },
  {
    border: "border-l-amber-500",
    bg: "bg-amber-50/50",
    ring: "ring-amber-100",
    title: "text-amber-900",
    badge: "bg-amber-100 text-amber-800",
  },
  {
    border: "border-l-sky-500",
    bg: "bg-sky-50/50",
    ring: "ring-sky-100",
    title: "text-sky-900",
    badge: "bg-sky-100 text-sky-800",
  },
  {
    border: "border-l-rose-500",
    bg: "bg-rose-50/50",
    ring: "ring-rose-100",
    title: "text-rose-900",
    badge: "bg-rose-100 text-rose-800",
  },
  {
    border: "border-l-indigo-500",
    bg: "bg-indigo-50/50",
    ring: "ring-indigo-100",
    title: "text-indigo-900",
    badge: "bg-indigo-100 text-indigo-800",
  },
] as const;

export function getCategoryTheme(index: number) {
  return CATEGORY_THEMES[index % CATEGORY_THEMES.length];
}
