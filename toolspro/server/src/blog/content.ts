// Chhote helpers: HTML saaf karna, entities decode karna, excerpt banana.

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  hellip: "…",
  ndash: "–",
  mdash: "—",
  lsquo: "‘",
  rsquo: "’",
  ldquo: "“",
  rdquo: "”",
  copy: "©",
  reg: "®",
  trade: "™",
};

export function decodeEntities(input: string): string {
  return input.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, body: string) => {
    if (body[0] === "#") {
      const isHex = body[1] === "x" || body[1] === "X";
      const code = parseInt(body.slice(isHex ? 2 : 1), isHex ? 16 : 10);
      if (!Number.isFinite(code) || code <= 0 || code > 0x10ffff) return match;
      return String.fromCodePoint(code);
    }
    const named = NAMED_ENTITIES[body.toLowerCase()];
    return named ?? match;
  });
}

export function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function escapeXml(input: string): string {
  return escapeHtml(input);
}

export function stripTags(html: string): string {
  return decodeEntities(
    html
      .replace(/<(script|style)\b[\s\S]*?<\/\1>/gi, " ")
      .replace(/<[^>]*>/g, " ")
      .replace(/\s+/g, " ")
  ).trim();
}

export function countWords(html: string): number {
  const text = stripTags(html);
  return text ? text.split(/\s+/).length : 0;
}

export function readingMinutes(html: string): number {
  return Math.max(1, Math.round(countWords(html) / 220));
}

// Title khali ho to content ke pehle heading se, warna slug se title banata hai.
export function fallbackTitle(html: string, slug: string): string {
  const heading = html.match(/<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/i);
  const fromHeading = heading ? stripTags(heading[1]) : "";
  if (fromHeading) return fromHeading.slice(0, 120);
  const words = slug.replace(/[-_]+/g, " ").replace(/\s+/g, " ").trim();
  return words ? words.charAt(0).toUpperCase() + words.slice(1) : "Untitled";
}

export function makeExcerpt(html: string, max = 160): string {
  const text = stripTags(html);
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  return (lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd() + "…";
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// WordPress ke content ko nayi site ke liye saaf karta hai:
// - script tags aur Gutenberg block comments hatata hai
// - apni site ke absolute links ko relative banata hai (/wp-content/..., /slug/)
// - images par lazy loading lagata hai
export function cleanContent(html: string, siteHosts: string[]): string {
  let out = html
    .replace(/<script\b[\s\S]*?<\/script>/gi, "")
    .replace(/<!--\s*\/?wp:[\s\S]*?-->/g, "");

  const hosts = siteHosts.filter(Boolean).map(escapeRegExp);
  if (hosts.length > 0) {
    const hostPattern = `https?:\\/\\/(?:www\\.)?(?:${hosts.join("|")})`;
    // https://site.com/abc -> /abc
    out = out.replace(new RegExp(`${hostPattern}(?=\\/)`, "gi"), "");
    // https://site.com (bina slash) -> /
    out = out.replace(new RegExp(`(href=["'])${hostPattern}(?=["'#?])`, "gi"), "$1/");
  }

  // data-* attributes (zyada tar editor ka kachra) hata dete hain, lazy-load wale data-src/data-lazy rehne dete hain
  out = out.replace(/\sdata-(?!src|lazy)[\w-]+=(?:"[^"]*"|'[^']*')/gi, "");

  out = out.replace(/<img\b(?![^>]*\sloading=)/gi, '<img loading="lazy" decoding="async"');
  return out.trim();
}

// Yoast/Rank Math ke templates, jaise "%%title%% %%sep%% %%sitename%%", ko asal text se badalta hai.
export function expandSeoTemplate(
  template: string,
  ctx: { title: string; siteName: string; excerpt?: string; category?: string }
): string {
  return template
    .replace(/%%title%%|%title%/gi, ctx.title)
    .replace(/%%sitename%%|%sitename%/gi, ctx.siteName)
    .replace(/%%sep%%|%sep%/gi, "-")
    .replace(/%%excerpt%%|%excerpt%/gi, ctx.excerpt ?? "")
    .replace(/%%primary_category%%|%category%/gi, ctx.category ?? "")
    .replace(/%%[a-z_0-9]+%%/gi, "") // baaqi unknown placeholders
    .replace(/\s+/g, " ")
    .trim();
}
