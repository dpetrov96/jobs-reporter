export const CATEGORY_THEMES = [
  { dot: "bg-emerald-500", label: "text-emerald-800" },
  { dot: "bg-violet-500", label: "text-violet-800" },
  { dot: "bg-amber-500", label: "text-amber-800" },
  { dot: "bg-sky-500", label: "text-sky-800" },
  { dot: "bg-rose-500", label: "text-rose-800" },
  { dot: "bg-indigo-500", label: "text-indigo-800" },
] as const;

export function getCategoryTheme(index: number) {
  return CATEGORY_THEMES[index % CATEGORY_THEMES.length];
}
