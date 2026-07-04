const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const LINKEDIN_BLOCKED_STATUSES = new Set([403, 429, 999]);
const MAX_FETCH_ATTEMPTS = 4;

function isLinkedInBlocked(status: number, html: string): boolean {
  return (
    LINKEDIN_BLOCKED_STATUSES.has(status) ||
    html.includes("authwall") ||
    html.includes("checkpoint/challenge")
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchLinkedInHtmlOnce(url: string): Promise<{ status: number; html: string }> {
  const response = await fetch(url, {
    headers: {
      "User-Agent": USER_AGENT,
      Accept: "text/html,application/xhtml+xml",
      "Accept-Language": "bg,en;q=0.9",
      Referer: "https://www.linkedin.com/jobs/search/",
    },
  });

  return {
    status: response.status,
    html: await response.text(),
  };
}

export async function fetchLinkedInHtml(url: string): Promise<string> {
  console.log(`[linkedin] GET ${url}`);

  let lastStatus = 0;
  let lastHtml = "";

  for (let attempt = 1; attempt <= MAX_FETCH_ATTEMPTS; attempt++) {
    const { status, html } = await fetchLinkedInHtmlOnce(url);
    lastStatus = status;
    lastHtml = html;
    console.log(
      `[linkedin] HTTP ${status} len=${html.length}${attempt > 1 ? ` (attempt ${attempt})` : ""}`
    );

    if (status >= 200 && status < 300 && !isLinkedInBlocked(status, html)) {
      return html;
    }

    if (attempt < MAX_FETCH_ATTEMPTS && isLinkedInBlocked(status, html)) {
      const waitMs = 2_500 * attempt;
      console.warn(`[linkedin] blocked (${status}) — retry in ${waitMs}ms`);
      await sleep(waitMs);
      continue;
    }

    break;
  }

  if (isLinkedInBlocked(lastStatus, lastHtml)) {
    throw new Error(
      `LinkedIn blocked the request (${lastStatus}) for ${url}. HTTP 999 = anti-bot/rate limit.`
    );
  }

  throw new Error(`LinkedIn fetch failed ${url}: ${lastStatus}`);
}
