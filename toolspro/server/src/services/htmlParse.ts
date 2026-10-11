// Ek chhota aur mehfooz HTML scanner. Poora browser parser nahi hai, sirf wo cheezein nikalta hai
// jo SEO tools ko chahiye: title, meta, link, headings, anchors, images, scripts. Ek hi guzar mein
// chalta hai (linear), is liye bohat bare ya ghalat HTML se server atakta nahi.

export interface MetaTag {
  name: string | null;
  property: string | null;
  httpEquiv: string | null;
  charset: string | null;
  content: string | null;
}

export interface LinkTag {
  rel: string;
  href: string;
  hreflang: string | null;
  type: string | null;
  sizes: string | null;
}

export interface Heading {
  level: number;
  text: string;
}

export interface Anchor {
  href: string;
  text: string;
  rel: string;
}

export interface ImageTag {
  src: string;
  alt: string | null;
}

export interface ParsedHtml {
  lang: string | null;
  title: string | null;
  metas: MetaTag[];
  links: LinkTag[];
  headings: Heading[];
  anchors: Anchor[];
  images: ImageTag[];
  scriptCount: number;
  inlineScriptCount: number;
  stylesheetCount: number;
  wordCount: number;
}

const MAX_TAG_LENGTH = 8000;
const WINDOW = 600;
const MAX_ITEMS = 5000;

const NAMED: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", copy: "©", reg: "®", ndash: "–", mdash: "—", hellip: "…", rsquo: "’", lsquo: "‘", rdquo: "”", ldquo: "“" };

export function decodeEntities(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (whole, body: string) => {
    if (body[0] === "#") {
      const code = body[1] === "x" || body[1] === "X" ? parseInt(body.slice(2), 16) : parseInt(body.slice(1), 10);
      if (!Number.isFinite(code) || code < 0 || code > 0x10ffff || (code >= 0xd800 && code <= 0xdfff)) return whole;
      return String.fromCodePoint(code);
    }
    return NAMED[body.toLowerCase()] ?? whole;
  });
}

const cleanText = (text: string) => decodeEntities(text.replace(/<[^<>]*>/g, " ")).replace(/\s+/g, " ").trim();

function parseAttributes(source: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  const pattern = /([^\s"'<>/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(source)) !== null) {
    const name = match[1]!.toLowerCase();
    if (name in attrs) continue; // pehli qeemat jeet-ti hai (browser ki tarah)
    attrs[name] = decodeEntities(match[2] ?? match[3] ?? match[4] ?? "");
  }
  return attrs;
}

// Tag ka end dhoondta hai ('>' jo quotes ke bahar ho)
function findTagEnd(html: string, from: number): number {
  const limit = Math.min(html.length, from + MAX_TAG_LENGTH);
  let quote = "";
  for (let i = from; i < limit; i += 1) {
    const ch = html[i]!;
    if (quote) {
      if (ch === quote) quote = "";
    } else if (ch === '"' || ch === "'") {
      quote = ch;
    } else if (ch === ">") {
      return i;
    }
  }
  return -1;
}

const isLetter = (ch: string | undefined) => ch !== undefined && /[a-zA-Z]/.test(ch);

export function parseHtml(html: string): ParsedHtml {
  const lower = html.toLowerCase();
  const result: ParsedHtml = {
    lang: null,
    title: null,
    metas: [],
    links: [],
    headings: [],
    anchors: [],
    images: [],
    scriptCount: 0,
    inlineScriptCount: 0,
    stylesheetCount: 0,
    wordCount: 0,
  };
  const allText: string[] = [];
  const bodyText: string[] = [];
  let inBody = false;
  let i = 0;
  const n = html.length;

  const addText = (text: string) => {
    if (text.trim() === "") return;
    allText.push(text);
    if (inBody) bodyText.push(text);
  };

  while (i < n) {
    const lt = html.indexOf("<", i);
    if (lt === -1) {
      addText(html.slice(i));
      break;
    }
    if (lt > i) addText(html.slice(i, lt));

    if (lower.startsWith("<!--", lt)) {
      const end = html.indexOf("-->", lt + 4);
      i = end === -1 ? n : end + 3;
      continue;
    }
    const next = html[lt + 1];
    if (next === "/" || next === "!" || next === "?") {
      const gt = html.indexOf(">", lt);
      i = gt === -1 ? n : gt + 1;
      continue;
    }
    if (!isLetter(next)) {
      addText("<");
      i = lt + 1;
      continue;
    }

    let j = lt + 1;
    while (j < n && /[a-zA-Z0-9:-]/.test(html[j]!)) j += 1;
    const name = lower.slice(lt + 1, j);
    const end = findTagEnd(html, j);
    if (end === -1) {
      addText("<");
      i = lt + 1;
      continue;
    }
    const attrs = parseAttributes(html.slice(j, end));
    i = end + 1;

    if (name === "script" || name === "style") {
      if (name === "script") {
        result.scriptCount += 1;
        if (!("src" in attrs)) result.inlineScriptCount += 1;
      }
      const close = lower.indexOf(`</${name}`, i);
      i = close === -1 ? n : close;
      continue;
    }

    if (name === "html") {
      if (result.lang === null && attrs["lang"] !== undefined) result.lang = attrs["lang"].trim() || null;
    } else if (name === "body") {
      inBody = true;
    } else if (name === "title") {
      const close = lower.indexOf("</title", i);
      const stop = close === -1 ? Math.min(n, i + 1000) : Math.min(close, i + 1000);
      if (result.title === null) result.title = cleanText(html.slice(i, stop));
      i = close === -1 ? stop : close;
    } else if (name === "meta" && result.metas.length < MAX_ITEMS) {
      result.metas.push({
        name: attrs["name"]?.trim().toLowerCase() ?? null,
        property: attrs["property"]?.trim().toLowerCase() ?? null,
        httpEquiv: attrs["http-equiv"]?.trim().toLowerCase() ?? null,
        charset: attrs["charset"]?.trim() ?? null,
        content: attrs["content"] ?? null,
      });
    } else if (name === "link" && result.links.length < MAX_ITEMS) {
      const rel = (attrs["rel"] ?? "").trim().toLowerCase();
      result.links.push({ rel, href: attrs["href"] ?? "", hreflang: attrs["hreflang"] ?? null, type: attrs["type"] ?? null, sizes: attrs["sizes"] ?? null });
      if (rel.split(/\s+/).includes("stylesheet")) result.stylesheetCount += 1;
    } else if (name === "img" && result.images.length < MAX_ITEMS) {
      result.images.push({ src: attrs["src"] ?? attrs["data-src"] ?? "", alt: attrs["alt"] ?? null });
    } else if (/^h[1-6]$/.test(name) && result.headings.length < MAX_ITEMS) {
      const windowText = lower.slice(i, i + WINDOW);
      const close = windowText.search(/<\/h[1-6]/);
      const text = cleanText(html.slice(i, i + (close === -1 ? WINDOW : close)));
      result.headings.push({ level: Number(name[1]), text });
    } else if (name === "a" && result.anchors.length < MAX_ITEMS) {
      const windowText = lower.slice(i, i + WINDOW);
      const close = windowText.indexOf("</a");
      const text = cleanText(html.slice(i, i + (close === -1 ? WINDOW : close)));
      if (attrs["href"] !== undefined) result.anchors.push({ href: attrs["href"].trim(), text, rel: (attrs["rel"] ?? "").trim().toLowerCase() });
    }
  }

  const words = (bodyText.length > 0 ? bodyText : allText).join(" ");
  const cleaned = decodeEntities(words).trim();
  result.wordCount = cleaned === "" ? 0 : cleaned.split(/\s+/).length;
  return result;
}

// Meta tag ki qeemat (name ya property se), pehli wali
export function metaValue(parsed: ParsedHtml, key: string): string | null {
  const wanted = key.toLowerCase();
  for (const meta of parsed.metas) {
    if ((meta.name === wanted || meta.property === wanted) && meta.content !== null) return meta.content;
  }
  return null;
}
