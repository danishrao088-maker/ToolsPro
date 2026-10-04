import { plural } from "../format";
import { advisory, checkHttpUrl, cleanText, escapeMarkup, joinNotes } from "./seoCommon";
import type { TransformResult } from "./types";

export type RobotsDirective = "index, follow" | "noindex, follow" | "index, nofollow" | "noindex, nofollow";

export const ROBOTS_OPTIONS: { value: RobotsDirective; label: string }[] = [
  { value: "index, follow", label: "Index and follow links (default)" },
  { value: "noindex, follow", label: "Do not index, follow links" },
  { value: "index, nofollow", label: "Index, do not follow links" },
  { value: "noindex, nofollow", label: "Do not index, do not follow links" },
];

export interface MetaTagInput {
  title: string;
  description: string;
  keywords: string;
  author: string;
  canonicalUrl: string;
  robots: RobotsDirective;
  includeViewport: boolean;
}

const LIMITS = { title: 200, description: 500, keywords: 500, author: 100 } as const;

function normalizeKeywords(value: string): string {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const part of value.split(",")) {
    const keyword = cleanText(part);
    const key = keyword.toLowerCase();
    if (keyword === "" || seen.has(key)) continue;
    seen.add(key);
    result.push(keyword);
  }
  return result.join(", ");
}

export function generateMetaTags(input: MetaTagInput): TransformResult {
  const title = cleanText(input.title);
  const description = cleanText(input.description);
  const author = cleanText(input.author);
  const keywords = normalizeKeywords(input.keywords);

  if (title === "") return { ok: false, error: "Enter a page title." };
  if (description === "") return { ok: false, error: "Enter a page description." };
  if (title.length > LIMITS.title) {
    return { ok: false, error: `The title is too long. The maximum is ${LIMITS.title} characters.` };
  }
  if (description.length > LIMITS.description) {
    return { ok: false, error: `The description is too long. The maximum is ${LIMITS.description} characters.` };
  }
  if (keywords.length > LIMITS.keywords) {
    return { ok: false, error: `The keywords are too long. The maximum is ${LIMITS.keywords} characters.` };
  }
  if (author.length > LIMITS.author) {
    return { ok: false, error: `The author name is too long. The maximum is ${LIMITS.author} characters.` };
  }
  if (!ROBOTS_OPTIONS.some((option) => option.value === input.robots)) {
    return { ok: false, error: "Choose a valid robots setting." };
  }

  let canonical = "";
  if (input.canonicalUrl.trim() !== "") {
    const checked = checkHttpUrl(input.canonicalUrl, "Canonical URL");
    if (!checked.ok) return checked;
    canonical = checked.href;
  }

  const lines: string[] = ['<meta charset="UTF-8">'];
  if (input.includeViewport) {
    lines.push('<meta name="viewport" content="width=device-width, initial-scale=1.0">');
  }
  lines.push(`<title>${escapeMarkup(title)}</title>`);
  lines.push(`<meta name="description" content="${escapeMarkup(description)}">`);
  if (keywords) lines.push(`<meta name="keywords" content="${escapeMarkup(keywords)}">`);
  if (author) lines.push(`<meta name="author" content="${escapeMarkup(author)}">`);
  lines.push(`<meta name="robots" content="${input.robots}">`);
  if (canonical) lines.push(`<link rel="canonical" href="${escapeMarkup(canonical)}">`);

  const notes = joinNotes([
    advisory("The title", title.length, 60, "search results"),
    advisory("The description", description.length, 160, "search results"),
  ]);

  return {
    ok: true,
    output: lines.join("\n"),
    message: `${plural(lines.length, "tag")} generated. Paste them inside the head of your page. ${notes}`.trim(),
  };
}