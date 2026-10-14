// Mobile aur speed ki jaanch ke liye HTML ka dusra, chhota scanner. parseHtml jo cheezein nahi nikalta
// (script ka async/defer, image ki width/height, inline CSS, style attribute) wo yahan nikalti hain.
// Ek hi guzar mein chalta hai aur har tag ki lambai ki had hai, is liye bare ya ghalat HTML se server atakta nahi.

export interface ScriptTag {
  src: string | null;
  async: boolean;
  defer: boolean;
  module: boolean;
  inHead: boolean;
}

export interface StylesheetTag {
  href: string;
  media: string | null;
  inHead: boolean;
}

export interface ImgTag {
  src: string;
  width: string | null;
  height: string | null;
  loading: string | null;
  srcset: boolean;
}

export interface RawScan {
  scripts: ScriptTag[];
  stylesheets: StylesheetTag[];
  images: ImgTag[];
  inlineCss: string;
  styleAttributes: string[];
  plugins: number;
  fixedWidthAttributes: number; // width="800" jaisi pixel wali chaurai (480 se zyada)
  hasTouchIcon: boolean;
  hasThemeColor: boolean;
  hasManifest: boolean;
}

const MAX_TAGS = 20000;
const MAX_ITEMS = 2000;
const MAX_CSS = 500_000;
const TAG_NAME = /^([a-zA-Z][a-zA-Z0-9]*)(?![\w])/;
const MAX_TAG_LENGTH = 4000;
const ATTR = /([^\s=/"'<>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g;
const WIDTH_TAGS = new Set(["table", "td", "th", "div", "img", "iframe", "video", "canvas", "embed", "object"]);
const PLUGIN_HINT = /flash|\.swf|java|silverlight|x-shockwave/i;

function readAttributes(raw: string): Map<string, string> {
  const out = new Map<string, string>();
  ATTR.lastIndex = 0;
  let match: RegExpExecArray | null;
  let count = 0;
  while ((match = ATTR.exec(raw)) !== null && count < 40) {
    count += 1;
    const name = match[1]!.toLowerCase();
    if (!out.has(name)) out.set(name, match[2] ?? match[3] ?? match[4] ?? "");
  }
  return out;
}

export function scanHtml(source: string): RawScan {
  const html = source.replace(/<!--[\s\S]*?-->/g, "");
  const headClose = html.search(/<\/head\s*>/i);
  const bodyOpen = html.search(/<body\b/i);
  const headEnd = headClose >= 0 ? headClose : bodyOpen >= 0 ? bodyOpen : -1;

  const scan: RawScan = {
    scripts: [], stylesheets: [], images: [], inlineCss: "", styleAttributes: [], plugins: 0,
    fixedWidthAttributes: 0, hasTouchIcon: false, hasThemeColor: false, hasManifest: false,
  };

  // Har "<" par sirf ek baar dekhte hain. Agla ">" ek hi baar dhoonda jata hai (aage barhta hai, peeche nahi),
  // is liye "<img <img <img ..." jaisa kharab matan bhi seedhi lakeer mein parha jata hai.
  let pos = 0;
  let gt = -1;
  let tags = 0;
  while (tags < MAX_TAGS) {
    const lt = html.indexOf("<", pos);
    if (lt < 0) break;
    if (gt < lt) {
      gt = html.indexOf(">", lt);
      if (gt < 0) break; // aage koi tag band nahi hota
    }
    pos = lt + 1;
    const nameMatch = TAG_NAME.exec(html.slice(lt + 1, lt + 41));
    if (!nameMatch || gt - lt > MAX_TAG_LENGTH) continue;
    tags += 1;
    const name = nameMatch[1]!.toLowerCase();
    const attrs = readAttributes(html.slice(lt + 1 + nameMatch[1]!.length, gt));
    const inHead = headEnd >= 0 && lt < headEnd;
    pos = gt + 1;
    const afterTag = pos;

    if (name === "script") {
      if (scan.scripts.length < MAX_ITEMS) {
        scan.scripts.push({ src: attrs.get("src") ?? null, async: attrs.has("async"), defer: attrs.has("defer"), module: (attrs.get("type") ?? "").toLowerCase() === "module", inHead });
      }
      const end = html.slice(afterTag).search(/<\/script\s*>/i); // script ke andar ka matan tag nahi hota
      if (end >= 0) pos = afterTag + end;
      continue;
    }
    if (name === "style") {
      const rest = html.slice(afterTag);
      const end = rest.search(/<\/style\s*>/i);
      const body = end >= 0 ? rest.slice(0, end) : rest;
      if (scan.inlineCss.length < MAX_CSS) scan.inlineCss += `${body.slice(0, MAX_CSS - scan.inlineCss.length)}\n`;
      if (end >= 0) pos = afterTag + end;
      continue;
    }
    if (name === "link") {
      const rel = (attrs.get("rel") ?? "").toLowerCase().split(/\s+/);
      if (rel.includes("stylesheet") && scan.stylesheets.length < MAX_ITEMS) scan.stylesheets.push({ href: attrs.get("href") ?? "", media: attrs.get("media") ?? null, inHead });
      if (rel.includes("apple-touch-icon") || rel.includes("apple-touch-icon-precomposed")) scan.hasTouchIcon = true;
      if (rel.includes("manifest")) scan.hasManifest = true;
    } else if (name === "meta") {
      if ((attrs.get("name") ?? "").toLowerCase() === "theme-color") scan.hasThemeColor = true;
    } else if (name === "img") {
      if (scan.images.length < MAX_ITEMS) {
        scan.images.push({ src: attrs.get("src") ?? "", width: attrs.get("width") ?? null, height: attrs.get("height") ?? null, loading: (attrs.get("loading") ?? "").toLowerCase() || null, srcset: attrs.has("srcset") });
      }
    } else if (name === "applet") {
      scan.plugins += 1;
    } else if ((name === "embed" || name === "object") && PLUGIN_HINT.test(`${attrs.get("type") ?? ""} ${attrs.get("src") ?? ""} ${attrs.get("data") ?? ""} ${attrs.get("classid") ?? ""}`)) {
      scan.plugins += 1;
    }

    const style = attrs.get("style");
    if (style && scan.styleAttributes.length < MAX_ITEMS) scan.styleAttributes.push(style);
    const width = attrs.get("width");
    if (width && WIDTH_TAGS.has(name) && /^\d+(px)?$/i.test(width.trim()) && parseInt(width, 10) > 480) scan.fixedWidthAttributes += 1;
  }
  return scan;
}