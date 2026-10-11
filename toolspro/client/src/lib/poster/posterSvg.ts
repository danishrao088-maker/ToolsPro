import { LOGO_FONTS, type LogoFont, type MeasureText } from "../logo/logoSvg";
import { wrapText } from "../flyer/wrapText";
import { isHexColor, luminance } from "../qr/qrColor";
import { escapeXml } from "../word/docx";

export type PosterTemplate = "bold" | "photo" | "split";
export type PosterSize = "a4" | "a3" | "letter" | "tabloid";
export type PosterOrientation = "portrait" | "landscape";

export const POSTER_TEMPLATES: { value: PosterTemplate; label: string }[] = [
  { value: "bold", label: "Big words on a colour" },
  { value: "photo", label: "Picture with words over it" },
  { value: "split", label: "Picture on top, words below" },
];

export const POSTER_SIZES: { value: PosterSize; label: string; inchesWide: number; inchesHigh: number; pointsWide: number; pointsHigh: number }[] = [
  { value: "a4", label: "A4", inchesWide: 8.27, inchesHigh: 11.69, pointsWide: 595.28, pointsHigh: 841.89 },
  { value: "a3", label: "A3", inchesWide: 11.69, inchesHigh: 16.54, pointsWide: 841.89, pointsHigh: 1190.55 },
  { value: "letter", label: "US Letter", inchesWide: 8.5, inchesHigh: 11, pointsWide: 612, pointsHigh: 792 },
  { value: "tabloid", label: "Tabloid (11 × 17 inch)", inchesWide: 11, inchesHigh: 17, pointsWide: 792, pointsHigh: 1224 },
];

export const POSTER_COLORS = ["#1d4ed8", "#15803d", "#b91c1c", "#c2410c", "#7e22ce", "#111827"];
export const POSTER_LIMITS = { headline: 60, subtitle: 100, details: 300, detailLines: 5 };

export interface PosterOptions {
  template: PosterTemplate;
  size: PosterSize;
  orientation: PosterOrientation;
  font: LogoFont;
  accent: string;
  headline: string;
  subtitle: string;
  details: string;
  imageDataUrl: string | null;
}

export const DEFAULT_POSTER: PosterOptions = {
  template: "bold",
  size: "a4",
  orientation: "portrait",
  font: "sans",
  accent: "#1d4ed8",
  headline: "",
  subtitle: "",
  details: "",
  imageDataUrl: null,
};

export interface PosterDims {
  inchesWide: number;
  inchesHigh: number;
  pointsWide: number;
  pointsHigh: number;
}

// Kagaz ka size, orientation ke hisaab se (landscape mein chaurai aur lambai ulat jati hain)
export function posterDims(size: PosterSize, orientation: PosterOrientation): PosterDims {
  const s = POSTER_SIZES.find((x) => x.value === size) ?? POSTER_SIZES[0]!;
  return orientation === "portrait"
    ? { inchesWide: s.inchesWide, inchesHigh: s.inchesHigh, pointsWide: s.pointsWide, pointsHigh: s.pointsHigh }
    : { inchesWide: s.inchesHigh, inchesHigh: s.inchesWide, pointsWide: s.pointsHigh, pointsHigh: s.pointsWide };
}

// SVG ki apni ikaiyan: chhoti side hamesha 600
export function posterViewBox(size: PosterSize, orientation: PosterOrientation): { width: number; height: number } {
  const d = posterDims(size, orientation);
  const short = Math.min(d.pointsWide, d.pointsHigh);
  return { width: Math.round((600 * d.pointsWide) / short), height: Math.round((600 * d.pointsHigh) / short) };
}

export interface HeadlineFit {
  size: number;
  lines: string[];
  fits: boolean;
}

// Sab se bara font size dhoondta hai jis mein headline diye gaye dabbe mein samaye aur koi lafz toota na ho
export function fitHeadline(text: string, maxWidth: number, maxHeight: number, measure: MeasureText, stack: string, range = { min: 28, max: 140, step: 4 }): HeadlineFit {
  const clean = text.replace(/\s+/g, " ").trim();
  for (let size = range.max; size >= range.min; size -= range.step) {
    const lines = wrapText(clean, maxWidth, (t) => measure(t, size, stack, true));
    const wordsKept = lines.join(" ") === clean;
    if (wordsKept && lines.length * size * 1.1 <= maxHeight) return { size, lines, fits: true };
  }
  const size = range.min;
  return { size, lines: wrapText(clean, maxWidth, (t) => measure(t, size, stack, true)), fits: false };
}

export type PosterResult = { ok: true; svg: string; width: number; height: number; overflow: boolean } | { ok: false; error: string };

function validate(o: PosterOptions): string {
  if (o.headline.trim() === "") return "Type a headline for the poster.";
  if (Array.from(o.headline).length > POSTER_LIMITS.headline) return `The headline can have up to ${POSTER_LIMITS.headline} characters.`;
  if (Array.from(o.subtitle).length > POSTER_LIMITS.subtitle) return `The subtitle can have up to ${POSTER_LIMITS.subtitle} characters.`;
  if (Array.from(o.details).length > POSTER_LIMITS.details) return `The details can have up to ${POSTER_LIMITS.details} characters.`;
  if (!isHexColor(o.accent)) return "The colour must look like #1d4ed8.";
  return "";
}

const fmt = (n: number) => String(Math.round(n * 100) / 100);
const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));
const onAccent = (accent: string) => (luminance(accent) > 0.4 ? "#111827" : "#ffffff");

export function buildPosterSvg(options: PosterOptions, measure: MeasureText): PosterResult {
  const problem = validate(options);
  if (problem) return { ok: false, error: problem };

  const { width: W, height: H } = posterViewBox(options.size, options.orientation);
  const stack = LOGO_FONTS.find((f) => f.value === options.font)?.stack ?? LOGO_FONTS[0]!.stack;
  const accent = options.accent;
  const pad = Math.round(Math.min(W, H) * 0.09);
  const hasImage = options.imageDataUrl !== null;

  const centered = options.template === "bold";
  const textColor = options.template === "bold" ? onAccent(accent) : options.template === "photo" ? "#ffffff" : "#111827";
  const headColor = options.template === "split" ? accent : textColor;

  const topBlock = options.template === "split" ? Math.round(H * 0.5) : 0;
  const regionTop = options.template === "split" ? topBlock + pad : pad;
  const regionHeight = H - regionTop - pad;
  const width = W - pad * 2;

  const available = options.template === "split" ? regionHeight : H - pad * 2;
  const wrapAt = (size: number, bold: boolean, text: string) => wrapText(text, width, (t) => measure(t, size, stack, bold));
  const details = options.details
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l !== "")
    .slice(0, POSTER_LIMITS.detailLines);

  // Headline ko bade se chhote size tak aazmate hain jab tak headline, subtitle aur details teeno dabbe mein samayen
  const tryFit = (maxHeight: number) => {
    const fit = fitHeadline(options.headline, width, maxHeight, measure, stack);
    const subSize = clamp(fit.size * 0.3, 18, 36);
    const detailSize = clamp(fit.size * 0.24, 16, 28);
    const sub = options.subtitle.trim() ? wrapAt(subSize, false, options.subtitle.replace(/\s+/g, " ").trim()) : [];
    const subH = sub.length ? 16 + sub.length * subSize * 1.3 : 0;
    const detailH = details.length ? 22 + details.length * detailSize * 1.5 : 0;
    return { head: fit, subSize, detailSize, sub, total: fit.lines.length * fit.size * 1.1 + subH + detailH };
  };
  let maxHeight = available * (options.template === "bold" ? 0.62 : 0.55);
  let chosen = tryFit(maxHeight);
  for (let attempt = 0; attempt < 10 && chosen.total > available && chosen.head.size > 28; attempt += 1) {
    maxHeight *= 0.85;
    chosen = tryFit(maxHeight);
  }
  const { head, subSize, detailSize, sub, total } = chosen;

  let y: number;
  if (options.template === "bold") y = Math.max(pad, (H - total) / 2);
  else if (options.template === "photo") y = Math.max(pad, H - pad - total);
  else y = regionTop;
  const overflow = !head.fits || total > available + 1;

  const parts: string[] = [];
  const defs: string[] = [];
  const anchor = centered ? "middle" : "start";
  const x = centered ? W / 2 : pad;
  const line = (top: number, size: number, content: string, extra: string) =>
    `<text x="${fmt(x)}" y="${fmt(top + size * 0.88)}" text-anchor="${anchor}" font-family="${stack}" font-size="${size}" ${extra}>${escapeXml(content)}</text>`;

  if (options.template === "bold") {
    parts.push(`<rect width="${W}" height="${H}" fill="${accent}"/>`);
  } else if (options.template === "photo") {
    parts.push(`<rect width="${W}" height="${H}" fill="${accent}"/>`);
    if (hasImage) parts.push(`<image href="${escapeXml(options.imageDataUrl ?? "")}" width="${W}" height="${H}" preserveAspectRatio="xMidYMid slice"/>`);
    defs.push(`<linearGradient id="fade" x1="0" y1="0" x2="0" y2="1"><stop offset="0.3" stop-color="#000000" stop-opacity="0"/><stop offset="1" stop-color="#000000" stop-opacity="0.8"/></linearGradient>`);
    parts.push(`<rect width="${W}" height="${H}" fill="url(#fade)"/>`);
  } else {
    parts.push(`<rect width="${W}" height="${H}" fill="#ffffff"/>`);
    parts.push(`<rect width="${W}" height="${topBlock}" fill="${accent}"/>`);
    if (hasImage) parts.push(`<image href="${escapeXml(options.imageDataUrl ?? "")}" width="${W}" height="${topBlock}" preserveAspectRatio="xMidYMid slice"/>`);
  }

  head.lines.forEach((text) => {
    parts.push(line(y, head.size, text, `font-weight="700" fill="${headColor}"`));
    y += head.size * 1.1;
  });
  if (sub.length) {
    y += 16;
    sub.forEach((text) => {
      parts.push(line(y, subSize, text, `fill="${textColor}" fill-opacity="0.9"`));
      y += subSize * 1.3;
    });
  }
  if (details.length) {
    y += 22;
    details.forEach((text) => {
      parts.push(line(y, detailSize, text, `font-weight="700" fill="${textColor}"`));
      y += detailSize * 1.5;
    });
  }

  const label = escapeXml(options.headline.trim());
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${label}">` +
    `<title>${label}</title>${defs.length ? `<defs>${defs.join("")}</defs>` : ""}${parts.join("")}</svg>`;
  return { ok: true, svg, width: W, height: H, overflow };
}