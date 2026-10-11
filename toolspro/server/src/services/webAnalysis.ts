import { metaValue, type ParsedHtml } from "./htmlParse";

// Ye file network ke baghair sirf parse kiye hue HTML ko parakhti hai (is liye tests aasaan hain).
// Yahan ke "behtar hai" wale hadd sirf aam raay hain, Google ya kisi search engine ka pakka qanoon nahi.

export interface PageInfo {
  url: string; // aakhri address (redirect ke baad)
  status: number;
  headers: Record<string, string>;
  timeMs: number;
  bodyBytes: number;
  truncated: boolean;
  redirects: number;
}

export type Level = "good" | "warning" | "missing" | "info";

export interface MetaCheck {
  id: string;
  label: string;
  value: string | null;
  level: Level;
  message: string;
}

const clip = (text: string, max = 300) => (text.length > max ? `${text.slice(0, max)}…` : text);

function resolveUrl(value: string, base: string): string | null {
  try {
    return new URL(value, base).href;
  } catch {
    return null;
  }
}

function sameHost(a: string, b: string): boolean {
  const strip = (host: string) => host.replace(/^www\./, "");
  return strip(a.toLowerCase()) === strip(b.toLowerCase());
}

const robotsDirectives = (parsed: ParsedHtml, page: PageInfo): string[] => {
  const values = [metaValue(parsed, "robots"), metaValue(parsed, "googlebot"), page.headers["x-robots-tag"] ?? null];
  return values
    .filter((v): v is string => v !== null)
    .flatMap((v) => v.toLowerCase().split(/[,\s]+/))
    .filter((v) => v !== "");
};

// ---------- Meta Tags Analyzer ----------

export interface MetaAnalysis {
  url: string;
  status: number;
  checks: MetaCheck[];
  summary: { good: number; warning: number; missing: number };
  allMeta: { name: string; content: string }[];
}

export function analyzeMeta(parsed: ParsedHtml, page: PageInfo): MetaAnalysis {
  const checks: MetaCheck[] = [];

  const title = parsed.title?.trim() ?? "";
  if (title === "") {
    checks.push({ id: "title", label: "Title", value: null, level: "missing", message: "The page has no title. Add a short title that describes the page." });
  } else if (title.length < 30) {
    checks.push({ id: "title", label: "Title", value: clip(title), level: "warning", message: `The title has ${title.length} characters. Titles of about 30 to 60 characters usually work well.` });
  } else if (title.length > 60) {
    checks.push({ id: "title", label: "Title", value: clip(title), level: "warning", message: `The title has ${title.length} characters and may be cut short in search results. About 30 to 60 characters is usual.` });
  } else {
    checks.push({ id: "title", label: "Title", value: title, level: "good", message: `The title has ${title.length} characters.` });
  }

  const description = metaValue(parsed, "description")?.trim() ?? "";
  if (description === "") {
    checks.push({ id: "description", label: "Meta description", value: null, level: "missing", message: "There is no meta description. Add one that summarises the page." });
  } else if (description.length < 70) {
    checks.push({ id: "description", label: "Meta description", value: clip(description), level: "warning", message: `The description has ${description.length} characters. About 70 to 160 characters is usual.` });
  } else if (description.length > 160) {
    checks.push({ id: "description", label: "Meta description", value: clip(description), level: "warning", message: `The description has ${description.length} characters and may be cut short. About 70 to 160 characters is usual.` });
  } else {
    checks.push({ id: "description", label: "Meta description", value: description, level: "good", message: `The description has ${description.length} characters.` });
  }

  const directives = robotsDirectives(parsed, page);
  const robotsText = [metaValue(parsed, "robots"), page.headers["x-robots-tag"]].filter((v): v is string => Boolean(v)).join(" | ");
  if (directives.includes("noindex") || directives.includes("none")) {
    checks.push({ id: "robots", label: "Robots", value: robotsText, level: "warning", message: "This page asks search engines not to index it (noindex)." });
  } else if (directives.includes("nofollow")) {
    checks.push({ id: "robots", label: "Robots", value: robotsText, level: "info", message: "This page asks search engines not to follow its links (nofollow)." });
  } else if (robotsText !== "") {
    checks.push({ id: "robots", label: "Robots", value: robotsText, level: "good", message: "No instruction that blocks indexing was found." });
  } else {
    checks.push({ id: "robots", label: "Robots", value: null, level: "info", message: "No robots tag. Search engines can index the page by default." });
  }

  const canonicalHref = parsed.links.find((l) => l.rel.split(/\s+/).includes("canonical"))?.href ?? "";
  if (canonicalHref === "") {
    checks.push({ id: "canonical", label: "Canonical link", value: null, level: "warning", message: "No canonical link. It helps tell search engines the main address of this page." });
  } else {
    const resolved = resolveUrl(canonicalHref, page.url);
    const same = resolved !== null && resolved.replace(/\/$/, "") === page.url.replace(/\/$/, "");
    checks.push({
      id: "canonical",
      label: "Canonical link",
      value: resolved ?? canonicalHref,
      level: resolved === null ? "warning" : "good",
      message: resolved === null ? "The canonical link is not a valid address." : same ? "The canonical link points to this page." : "The canonical link points to a different address.",
    });
  }

  const viewport = metaValue(parsed, "viewport")?.trim() ?? "";
  if (viewport === "") checks.push({ id: "viewport", label: "Viewport", value: null, level: "missing", message: "No viewport tag. The page may not display well on phones." });
  else if (!/width\s*=\s*device-width/i.test(viewport)) checks.push({ id: "viewport", label: "Viewport", value: viewport, level: "warning", message: "The viewport does not use width=device-width." });
  else checks.push({ id: "viewport", label: "Viewport", value: viewport, level: "good", message: "The page is set up for mobile screens." });

  const httpEquivType = parsed.metas.find((m) => m.httpEquiv === "content-type")?.content ?? "";
  const headerCharset = /charset=([^;\s]+)/i.exec(page.headers["content-type"] ?? "")?.[1] ?? null;
  const charset = parsed.metas.find((m) => m.charset)?.charset ?? /charset=([^;\s]+)/i.exec(httpEquivType)?.[1] ?? headerCharset;
  if (charset) checks.push({ id: "charset", label: "Character set", value: charset, level: charset.toLowerCase() === "utf-8" ? "good" : "info", message: charset.toLowerCase() === "utf-8" ? "The page uses UTF-8." : "UTF-8 is the usual choice." });
  else checks.push({ id: "charset", label: "Character set", value: null, level: "warning", message: "No character set was found. Add <meta charset=\"utf-8\">." });

  if (parsed.lang) checks.push({ id: "language", label: "Language", value: parsed.lang, level: "good", message: "The page declares its language." });
  else checks.push({ id: "language", label: "Language", value: null, level: "warning", message: "The <html> tag has no lang attribute." });

  const h1Count = parsed.headings.filter((h) => h.level === 1).length;
  if (h1Count === 1) checks.push({ id: "h1", label: "H1 heading", value: clip(parsed.headings.find((h) => h.level === 1)?.text ?? ""), level: "good", message: "The page has one H1 heading." });
  else if (h1Count === 0) checks.push({ id: "h1", label: "H1 heading", value: null, level: "warning", message: "The page has no H1 heading." });
  else checks.push({ id: "h1", label: "H1 heading", value: `${h1Count} found`, level: "warning", message: "The page has more than one H1 heading. One is usually enough." });

  const hasIcon = parsed.links.some((l) => l.rel.split(/\s+/).some((r) => r === "icon" || r === "apple-touch-icon"));
  checks.push(
    hasIcon
      ? { id: "icon", label: "Icon", value: null, level: "good", message: "An icon link was found." }
      : { id: "icon", label: "Icon", value: null, level: "info", message: "No icon link in the HTML. Browsers may still find /favicon.ico." }
  );

  const keywords = metaValue(parsed, "keywords");
  if (keywords) checks.push({ id: "keywords", label: "Keywords", value: clip(keywords), level: "info", message: "Major search engines do not use the keywords tag." });

  const allMeta = parsed.metas
    .filter((m) => (m.name || m.property) && m.content !== null)
    .slice(0, 80)
    .map((m) => ({ name: (m.name ?? m.property) as string, content: clip(m.content ?? "", 400) }));

  const count = (level: Level) => checks.filter((c) => c.level === level).length;
  return { url: page.url, status: page.status, checks, summary: { good: count("good"), warning: count("warning"), missing: count("missing") }, allMeta };
}

// ---------- Open Graph Checker ----------

export interface OgCheck {
  tag: string;
  value: string | null;
  level: Level;
  message: string;
}

export interface OpenGraphAnalysis {
  url: string;
  status: number;
  openGraph: OgCheck[];
  twitter: OgCheck[];
  preview: { title: string; description: string; image: string | null; siteName: string; host: string };
  otherTags: { tag: string; content: string }[];
  summary: { good: number; warning: number; missing: number };
}

export function analyzeOpenGraph(parsed: ParsedHtml, page: PageInfo): OpenGraphAnalysis {
  const og = (tag: string) => parsed.metas.find((m) => m.property === tag && m.content !== null)?.content?.trim() || null;
  const tw = (tag: string) => parsed.metas.find((m) => (m.name === tag || m.property === tag) && m.content !== null)?.content?.trim() || null;

  const openGraph: OgCheck[] = [];
  const need = (tag: string, why: string) => {
    const value = og(tag);
    openGraph.push(value ? { tag, value: clip(value), level: "good", message: "Found." } : { tag, value: null, level: "missing", message: why });
  };
  const want = (tag: string, why: string) => {
    const value = og(tag);
    openGraph.push(value ? { tag, value: clip(value), level: "good", message: "Found." } : { tag, value: null, level: "warning", message: why });
  };
  need("og:title", "Required. The title shown when the page is shared.");
  need("og:type", "Required. The kind of page, for example website or article.");
  need("og:url", "Required. The main address of the page.");

  const image = og("og:image");
  let imageAbsolute: string | null = null;
  if (!image) {
    openGraph.push({ tag: "og:image", value: null, level: "missing", message: "Required. The picture shown when the page is shared." });
  } else {
    imageAbsolute = resolveUrl(image, page.url);
    openGraph.push(
      /^https?:\/\//i.test(image)
        ? { tag: "og:image", value: clip(image), level: "good", message: "Found." }
        : { tag: "og:image", value: clip(image), level: "warning", message: "The picture address should be a full address starting with https://." }
    );
  }
  want("og:description", "Recommended. A short text shown under the title.");
  want("og:site_name", "Recommended. The name of the whole website.");
  if (image) want("og:image:alt", "Recommended. A text description of the picture.");

  const twitter: OgCheck[] = [];
  const card = tw("twitter:card");
  twitter.push(
    card
      ? { tag: "twitter:card", value: card, level: ["summary", "summary_large_image", "app", "player"].includes(card) ? "good" : "warning", message: ["summary", "summary_large_image", "app", "player"].includes(card) ? "Found." : "Unusual card type. Common ones are summary and summary_large_image." }
      : { tag: "twitter:card", value: null, level: "warning", message: "Recommended for a rich card on X (Twitter)." }
  );
  for (const tag of ["twitter:title", "twitter:description", "twitter:image"]) {
    const value = tw(tag);
    const fallback = og(tag.replace("twitter:", "og:"));
    twitter.push(
      value
        ? { tag, value: clip(value), level: "good", message: "Found." }
        : { tag, value: null, level: fallback ? "info" : "warning", message: fallback ? "Not set. X usually falls back to the matching Open Graph tag." : "Not set, and there is no Open Graph tag to fall back to." }
    );
  }

  const known = new Set(["og:title", "og:type", "og:url", "og:image", "og:description", "og:site_name", "og:image:alt", "twitter:card", "twitter:title", "twitter:description", "twitter:image"]);
  const otherTags = parsed.metas
    .map((m) => ({ tag: m.property ?? m.name ?? "", content: m.content ?? "" }))
    .filter((m) => (m.tag.startsWith("og:") || m.tag.startsWith("twitter:") || m.tag.startsWith("article:") || m.tag.startsWith("fb:")) && !known.has(m.tag))
    .slice(0, 40)
    .map((m) => ({ tag: m.tag, content: clip(m.content, 300) }));

  const all = [...openGraph, ...twitter];
  const count = (level: Level) => all.filter((c) => c.level === level).length;
  const host = (() => {
    try {
      return new URL(page.url).hostname;
    } catch {
      return "";
    }
  })();
  return {
    url: page.url,
    status: page.status,
    openGraph,
    twitter,
    preview: {
      title: og("og:title") ?? parsed.title?.trim() ?? "",
      description: og("og:description") ?? metaValue(parsed, "description")?.trim() ?? "",
      image: imageAbsolute,
      siteName: og("og:site_name") ?? host,
      host,
    },
    otherTags,
    summary: { good: count("good"), warning: count("warning"), missing: count("missing") },
  };
}

// ---------- Website Page Snooper ----------

export interface PageSnoop {
  url: string;
  status: number;
  responseTimeMs: number;
  htmlBytes: number;
  truncated: boolean;
  redirects: number;
  headers: { name: string; value: string }[];
  title: string | null;
  description: string | null;
  language: string | null;
  headings: { level: number; text: string }[];
  headingCounts: Record<string, number>;
  links: { total: number; internal: number; external: number; nofollow: number; other: number; items: { href: string; text: string; external: boolean; nofollow: boolean }[] };
  images: { total: number; missingAlt: number; emptyAlt: number };
  scripts: { total: number; inline: number; external: number };
  stylesheets: number;
  wordCount: number;
}

export function snoopPage(parsed: ParsedHtml, page: PageInfo): PageSnoop {
  let host = "";
  try {
    host = new URL(page.url).hostname;
  } catch {
    host = "";
  }
  const seen = new Set<string>();
  const items: PageSnoop["links"]["items"] = [];
  let internal = 0;
  let external = 0;
  let nofollow = 0;
  let other = 0;
  for (const anchor of parsed.anchors) {
    const href = anchor.href;
    if (href === "" || href.startsWith("#") || /^(mailto:|tel:|javascript:|sms:|data:)/i.test(href)) {
      other += 1;
      continue;
    }
    const resolved = resolveUrl(href, page.url);
    if (!resolved || !/^https?:/i.test(resolved)) {
      other += 1;
      continue;
    }
    const isExternal = !sameHost(new URL(resolved).hostname, host);
    const isNofollow = anchor.rel.split(/\s+/).includes("nofollow");
    if (isExternal) external += 1;
    else internal += 1;
    if (isNofollow) nofollow += 1;
    if (!seen.has(resolved) && items.length < 100) {
      seen.add(resolved);
      items.push({ href: resolved, text: clip(anchor.text, 120), external: isExternal, nofollow: isNofollow });
    }
  }

  const headingCounts: Record<string, number> = { h1: 0, h2: 0, h3: 0, h4: 0, h5: 0, h6: 0 };
  for (const heading of parsed.headings) headingCounts[`h${heading.level}`] = (headingCounts[`h${heading.level}`] ?? 0) + 1;

  return {
    url: page.url,
    status: page.status,
    responseTimeMs: page.timeMs,
    htmlBytes: page.bodyBytes,
    truncated: page.truncated,
    redirects: page.redirects,
    headers: Object.entries(page.headers)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => a.name.localeCompare(b.name)),
    title: parsed.title,
    description: metaValue(parsed, "description"),
    language: parsed.lang,
    headings: parsed.headings.slice(0, 60).map((h) => ({ level: h.level, text: clip(h.text, 160) })),
    headingCounts,
    links: { total: parsed.anchors.length, internal, external, nofollow, other, items },
    images: {
      total: parsed.images.length,
      missingAlt: parsed.images.filter((img) => img.alt === null).length,
      emptyAlt: parsed.images.filter((img) => img.alt !== null && img.alt.trim() === "").length,
    },
    scripts: { total: parsed.scriptCount, inline: parsed.inlineScriptCount, external: parsed.scriptCount - parsed.inlineScriptCount },
    stylesheets: parsed.stylesheetCount,
    wordCount: parsed.wordCount,
  };
}

// ---------- Website SEO Score Checker ----------

export interface ScoreCheck {
  id: string;
  label: string;
  status: "pass" | "warn" | "fail";
  points: number;
  max: number;
  message: string;
}

export interface SeoScore {
  url: string;
  score: number;
  verdict: "good" | "needs_work" | "poor";
  checks: ScoreCheck[];
  note: string;
}

export function scorePage(parsed: ParsedHtml, page: PageInfo): SeoScore {
  const checks: ScoreCheck[] = [];
  const add = (id: string, label: string, max: number, points: number, message: string) => {
    checks.push({ id, label, max, points, status: points >= max ? "pass" : points > 0 ? "warn" : "fail", message });
  };

  add("status", "Page loads", 10, page.status >= 200 && page.status < 300 ? 10 : 0, page.status >= 200 && page.status < 300 ? "The page answered with a success status." : `The page answered with status ${page.status}.`);

  const https = page.url.startsWith("https://");
  add("https", "Secure (HTTPS)", 10, https ? 10 : 0, https ? "The page uses HTTPS." : "The page is not served over HTTPS.");

  const title = parsed.title?.trim() ?? "";
  if (title === "") add("title", "Title", 10, 0, "No title found.");
  else if (title.length >= 30 && title.length <= 60) add("title", "Title", 10, 10, `The title has ${title.length} characters.`);
  else add("title", "Title", 10, 5, `The title has ${title.length} characters. About 30 to 60 is usual.`);

  const description = metaValue(parsed, "description")?.trim() ?? "";
  if (description === "") add("description", "Meta description", 10, 0, "No meta description found.");
  else if (description.length >= 70 && description.length <= 160) add("description", "Meta description", 10, 10, `The description has ${description.length} characters.`);
  else add("description", "Meta description", 10, 5, `The description has ${description.length} characters. About 70 to 160 is usual.`);

  const h1Count = parsed.headings.filter((h) => h.level === 1).length;
  add("h1", "H1 heading", 8, h1Count === 1 ? 8 : h1Count > 1 ? 4 : 0, h1Count === 1 ? "The page has one H1 heading." : h1Count === 0 ? "No H1 heading found." : `${h1Count} H1 headings found. One is usually enough.`);

  const viewport = metaValue(parsed, "viewport") ?? "";
  add("viewport", "Mobile viewport", 7, /width\s*=\s*device-width/i.test(viewport) ? 7 : 0, /width\s*=\s*device-width/i.test(viewport) ? "The page is set up for mobile screens." : "No mobile viewport tag found.");

  add("language", "Language", 5, parsed.lang ? 5 : 0, parsed.lang ? `The page language is ${parsed.lang}.` : "The <html> tag has no lang attribute.");

  const hasCanonical = parsed.links.some((l) => l.rel.split(/\s+/).includes("canonical") && l.href !== "");
  add("canonical", "Canonical link", 5, hasCanonical ? 5 : 0, hasCanonical ? "A canonical link was found." : "No canonical link found.");

  const directives = robotsDirectives(parsed, page);
  const noindex = directives.includes("noindex") || directives.includes("none");
  add("indexable", "Allowed to be indexed", 10, noindex ? 0 : 10, noindex ? "The page asks search engines not to index it (noindex)." : "No instruction that blocks indexing was found.");

  const total = parsed.images.length;
  const withAlt = parsed.images.filter((img) => img.alt !== null && img.alt.trim() !== "").length;
  if (total === 0) add("alt", "Image descriptions (alt)", 8, 8, "No images found, so nothing to describe.");
  else if (withAlt === total) add("alt", "Image descriptions (alt)", 8, 8, `All ${total} images have an alt text.`);
  else if (withAlt / total >= 0.8) add("alt", "Image descriptions (alt)", 8, 4, `${total - withAlt} of ${total} images have no alt text.`);
  else add("alt", "Image descriptions (alt)", 8, 0, `${total - withAlt} of ${total} images have no alt text.`);

  const ogTitle = metaValue(parsed, "og:title");
  const ogImage = metaValue(parsed, "og:image");
  add("social", "Social sharing tags", 5, ogTitle && ogImage ? 5 : ogTitle || ogImage ? 2 : 0, ogTitle && ogImage ? "og:title and og:image were found." : "Add og:title and og:image for better link previews.");

  add("content", "Amount of text", 7, parsed.wordCount >= 300 ? 7 : parsed.wordCount >= 150 ? 3 : 0, `The page has about ${parsed.wordCount} words.${parsed.wordCount < 300 ? " Pages with 300 or more words usually cover a topic better." : ""}`);

  add("speed", "Page load time (HTML)", 5, page.timeMs < 1500 ? 5 : page.timeMs < 3000 ? 2 : 0, `The page HTML loaded in ${page.timeMs} ms, measured from our server.`);

  const score = checks.reduce((sum, c) => sum + c.points, 0);
  return {
    url: page.url,
    score,
    verdict: score >= 80 ? "good" : score >= 50 ? "needs_work" : "poor",
    checks,
    note: "This score checks a few basic on-page points. It is not a prediction of search ranking.",
  };
}
