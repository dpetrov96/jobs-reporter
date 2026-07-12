export function formatAnalysisProgress(message: string | undefined): string | undefined {
  if (!message) return message;

  const replacements: Array<[RegExp, string]> = [
    [/^Изчаква старт на worker…$/, "Waiting for worker…"],
    [/^Стартиране на анализа…$/, "Starting analysis…"],
    [/^Зареждане на скрейпове…/, "Loading scrapes…"],
    [/^Изчисляване на статистики за (\d+) сканирания…$/, "Computing stats for $1 scrapes…"],
    [/^Зареждане на job descriptions за AI \((\d+) обяви\)…$/, "Loading job descriptions for AI ($1 listings)…"],
    [/^Четене на job descriptions…/, "Reading job descriptions…"],
    [/^AI анализ \(([^)]+)\) с (\d+) descriptions…$/, "AI analysis ($1) with $2 descriptions…"],
    [/^AI анализ \(([^)]+)\)…$/, "AI analysis ($1)…"],
    [/^AI пропуснат — липсва OPENAI_API_KEY$/, "AI skipped — OPENAI_API_KEY not configured"],
    [/^Записване на резултатите…$/, "Saving results…"],
    [/^Завършен с AI препоръки$/, "Completed with AI recommendations"],
    [/^Завършен без AI: (.+)$/, "Completed without AI: $1"],
    [/^Няма скрейпове за този период$/, "No scrapes for this period"],
    [/^Грешка: (.+)$/, "Error: $1"],
    [/сканирания/g, "scrapes"],
    [/уникални позиции/g, "unique jobs"],
    [/обяви/g, "listings"],
    [/страница/g, "page"],
    [/включен/g, "enabled"],
    [/изключен — няма ключ/g, "disabled — no API key"],
  ];

  let result = message;
  for (const [pattern, replacement] of replacements) {
    result = result.replace(pattern, replacement);
  }

  return result;
}
