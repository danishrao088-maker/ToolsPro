import { metaValue, type ParsedHtml } from "./htmlParse";
import { scanHtml, type RawScan } from "./htmlScan";
import type { PageInfo, SeoScore } from "./webAnalysis";

// "Mobile Friendly Test": HTML dekh kar kuch buniyadi baatein jaanchta hai. Ye asli phone par page nahi dikhata.
// Nateeje ki shakal SeoScore jaisi hai, taake client ek hi dikhawa istemal kar sake.

const NOTE =
  "This is a quick check of the page's HTML and its first linked stylesheets (up to 4). It cannot see how the page really looks on a phone: text size, tap targets and sideways scrolling need a real device or the phone view in your browser's developer tools.";

// Page ki linked stylesheets ka haal: kitni hain aur kin ka matan parh liya gaya
export interface CssInfo {
  linked: number;
  texts: string[];
}

export interface ViewportInfo {
  present: boolean;
  deviceWidth: boolean;
  zoomBlocked: boolean;
  content: string;
}

export function readViewport(content: string | null): ViewportInfo {
  if (content === null) return { present: false, deviceWidth: false, zoomBlocked: false, content: "" };
  const parts = content.toLowerCase().split(/[,;]/).map((part) => part.trim());
  const value = (key: string) => parts.find((part) => part.startsWith(`${key}=`))?.slice(key.length + 1).trim() ?? null;
  const scalable = value("user-scalable");
  const maxScale = value("maximum-scale");
  const maxNumber = maxScale === null ? NaN : parseFloat(maxScale);
  return {
    present: true,
    deviceWidth: value("width") === "device-width",
    zoomBlocked: scalable === "no" || scalable === "0" || (Number.isFinite(maxNumber) && maxNumber < 2),
    content: content.trim().slice(0, 200),
  };
}

export function smallFontCount(css: string): number {
  let count = 0;
  for (const match of css.matchAll(/font-size\s*:\s*(\d+(?:\.\d+)?)px/gi)) {
    if (parseFloat(match[1]!) < 12) count += 1;
  }
  return count;
}

export function fixedWidthCount(scan: RawScan): number {
  let count = scan.fixedWidthAttributes;
  for (const style of scan.styleAttributes) {
    for (const match of style.matchAll(/(?:^|[;\s{])width\s*:\s*(\d+)px/gi)) {
      if (parseInt(match[1]!, 10) > 480) count += 1;
    }
  }
  return count;
}

export function hasResponsiveCss(scan: RawScan, extraCss = ""): boolean {
  if (/@media[^{]*(?:min|max)-width/i.test(`${scan.inlineCss}\n${extraCss}`)) return true;
  return scan.stylesheets.some((sheet) => sheet.media !== null && /(?:min|max)-width/i.test(sheet.media));
}

export function analyzeMobile(parsed: ParsedHtml, page: PageInfo, html: string, css: CssInfo): SeoScore {
  const scan = scanHtml(html);
  const linkedCss = css.texts.join("\n");
  const checks: SeoScore["checks"] = [];
  const add = (id: string, label: string, max: number, points: number, message: string) => {
    checks.push({ id, label, max, points, status: points >= max ? "pass" : points > 0 ? "warn" : "fail", message });
  };

  const viewport = readViewport(metaValue(parsed, "viewport"));
  if (!viewport.present) add("viewport", "Viewport tag", 30, 0, "No viewport tag found. Phones will show the page as a small copy of the desktop page.");
  else if (viewport.deviceWidth) add("viewport", "Viewport tag", 30, 30, `The viewport tag sets the width to the device width (${viewport.content}).`);
  else add("viewport", "Viewport tag", 30, 15, `A viewport tag exists (${viewport.content}) but it does not use width=device-width.`);

  if (!viewport.present) add("zoom", "Pinch to zoom", 10, 10, "No viewport tag, so zooming is not blocked.");
  else add("zoom", "Pinch to zoom", 10, viewport.zoomBlocked ? 0 : 10, viewport.zoomBlocked ? "The viewport tag stops visitors from zooming. This makes small text hard to read for some people." : "Visitors can zoom the page.");

  const readAll = css.texts.length >= css.linked;
  if (hasResponsiveCss(scan, linkedCss)) add("responsive", "Responsive styles", 15, 15, "Styles that change with the screen width (media queries) were found.");
  else if (!readAll) add("responsive", "Responsive styles", 15, 8, `No media queries were found, but only ${css.texts.length} of ${css.linked} linked stylesheets could be read.`);
  else add("responsive", "Responsive styles", 15, 8, "No media queries were found. A simple flexible layout can still work on phones without them.");

  const fixed = fixedWidthCount(scan);
  add("fixed-width", "Fixed wide elements", 10, fixed === 0 ? 10 : 0, fixed === 0 ? "No elements with a fixed width over 480 pixels were found in the HTML." : `${fixed} element${fixed === 1 ? " has" : "s have"} a fixed width over 480 pixels. They can make the page scroll sideways on a phone.`);

  add("plugins", "No plugins", 10, scan.plugins === 0 ? 10 : 0, scan.plugins === 0 ? "No Flash, Java or similar plugins were found." : "Plugins such as Flash or Java were found. Phones do not support them.");

  const small = smallFontCount(`${scan.inlineCss}\n${linkedCss}\n${scan.styleAttributes.join("\n")}`);
  add("font-size", "Readable text size", 10, small === 0 ? 10 : small < 5 ? 5 : 0, small === 0 ? "No text smaller than 12 pixels was found in the page's styles." : `${small} style rule${small === 1 ? "" : "s"} set text smaller than 12 pixels, which is hard to read on a phone.`);

  const https = page.url.startsWith("https://");
  add("https", "Secure (HTTPS)", 5, https ? 5 : 0, https ? "The page uses HTTPS." : "The page is not served over HTTPS, and phone browsers warn about this.");

  const wideImages = scan.images.filter((img) => !img.srcset && img.width !== null && /^\d+(px)?$/i.test(img.width.trim()) && parseInt(img.width, 10) > 480).length;
  add("images", "Image sizes", 5, wideImages === 0 ? 5 : 2, wideImages === 0 ? "No images with a large fixed width were found." : `${wideImages} image${wideImages === 1 ? " has" : "s have"} a large fixed width and no srcset. Smaller versions for phones would load faster.`);

  const extras = [scan.hasThemeColor && "theme colour", scan.hasTouchIcon && "home screen icon", scan.hasManifest && "web app manifest"].filter((x): x is string => typeof x === "string");
  add("extras", "Phone extras (optional)", 5, extras.length > 0 ? 5 : 2, extras.length > 0 ? `Found: ${extras.join(", ")}.` : "No theme colour, home screen icon or web app manifest found. These are optional.");

  const score = checks.reduce((sum, check) => sum + check.points, 0);
  const verdict = !viewport.present ? "poor" : score >= 80 ? "good" : score >= 50 ? "needs_work" : "poor";
  return { url: page.url, score, verdict, checks, note: NOTE };
}