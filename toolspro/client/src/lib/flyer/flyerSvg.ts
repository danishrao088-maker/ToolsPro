import { LOGO_FONTS, type LogoFont, type MeasureText } from "../logo/logoSvg";
import { isHexColor, luminance } from "../qr/qrColor";
import { escapeXml } from "../word/docx";
import { wrapText } from "./wrapText";

export type FlyerTemplate = "band" | "center" | "side";
export type FlyerPaper = "a4" | "letter";

export const FLYER_TEMPLATES: { value: FlyerTemplate; label: string }[] = [
  { value: "band", label: "Colour band on top" },
  { value: "center", label: "Centered with a frame" },
  { value: "side", label: "Colour stripe on the side" },
];

export const FLYER_PAPERS: { value: FlyerPaper; label: string; inchesWide: number; inchesHigh: number; pointsWide: number; pointsHigh: number }[] = [
  { value: "a4", label: "A4", inchesWide: 8.27, inchesHigh: 11.69, pointsWide: 595.28, pointsHigh: 841.89 },
  { value: "letter", label: "US Letter", inchesWide: 8.5, inchesHigh: 11, pointsWide: 612, pointsHigh: 792 },
];

export const FLYER_COLORS = ["#1d4ed8", "#15803d", "#b91c1c", "#c2410c", "#7e22ce", "#111827"];

export const FLYER_LIMITS = { headline: 80, subtitle: 120, body: 600, details: 400, cta: 40, detailLines: 6 };

export interface FlyerOptions {
  template: FlyerTemplate;
  paper: FlyerPaper;
  font: LogoFont;
  accent: string;
  headline: string;
  subtitle: string;
  body: string;
  details: string; // har line ek baat: tareekh, jagah, rabta...
  cta: string;
  imageDataUrl: string | null;
}

export const DEFAULT_FLYER: FlyerOptions = {
  template: "band",
  paper: "a4",
  font: "sans",
  accent: "#1d4ed8",
  headline: "",
  subtitle: "",
  body: "",
  details: "",
  cta: "",
  imageDataUrl: null,
};

export type FlyerResult = { ok: true; svg: string; width: number; height: number; overflow: boolean } | { ok: false; error: string };

export const FLYER_WIDTH = 600;
const IMAGE_HEIGHT = 220;

export function flyerHeight(paper: FlyerPaper): number {
  const p = FLYER_PAPERS.find((x) => x.value === paper) ?? FLYER_PAPERS[0]!;
  return Math.round((FLYER_WIDTH * p.pointsHigh) / p.pointsWide);
}

function validate(o: FlyerOptions): string {
  if (o.headline.trim() === "") return "Type a headline for the flyer.";
  if (Array.from(o.headline).length > FLYER_LIMITS.headline) return `The headline can have up to ${FLYER_LIMITS.headline} characters.`;
  if (Array.from(o.subtitle).length > FLYER_LIMITS.subtitle) return `The subtitle can have up to ${FLYER_LIMITS.subtitle} characters.`;
  if (Array.from(o.body).length > FLYER_LIMITS.body) return `The description can have up to ${FLYER_LIMITS.body} characters.`;
  if (Array.from(o.details).length > FLYER_LIMITS.details) return `The details can have up to ${FLYER_LIMITS.details} characters.`;
  if (Array.from(o.cta).length > FLYER_LIMITS.cta) return `The button text can have up to ${FLYER_LIMITS.cta} characters.`;
  if (!isHexColor(o.accent)) return "The colour must look like #1d4ed8.";
  return "";
}

const fmt = (n: number) => String(Math.round(n * 100) / 100);
const onAccent = (accent: string) => (luminance(accent) > 0.4 ? "#111827" : "#ffffff");

export function buildFlyerSvg(options: FlyerOptions, measure: MeasureText): FlyerResult {
  const problem = validate(options);
  if (problem) return { ok: false, error: problem };

  const W = FLYER_WIDTH;
  const H = flyerHeight(options.paper);
  const stack = LOGO_FONTS.find((f) => f.value === options.font)?.stack ?? LOGO_FONTS[0]!.stack;
  const accent = options.accent;
  const ink = "#111827";
  const centered = options.template === "center";
  const sized = (size: number, bold: boolean) => (text: string) => measure(text, size, stack, bold);

  const left = options.template === "side" ? 128 : options.template === "center" ? 56 : 48;
  const right = options.template === "side" ? 48 : left;
  const width = W - left - right;
  const anchorX = centered ? W / 2 : left;
  const anchor = centered ? "middle" : "start";

  const parts: string[] = [];
  const defs: string[] = [];
  let overflow = false;

  const text = (x: number, top: number, size: number, content: string, extra: string) =>
    `<text x="${fmt(x)}" y="${fmt(top + size * 0.88)}" text-anchor="${anchor === "middle" && x === anchorX ? "middle" : "start"}" font-family="${stack}" font-size="${size}" ${extra}>${escapeXml(content)}</text>`;

  parts.push(`<rect width="${W}" height="${H}" fill="#ffffff"/>`);

  const headSize = 46;
  const subSize = 22;
  const headLines = wrapText(options.headline.trim(), width, sized(headSize, true));
  const subLines = options.subtitle.trim() ? wrapText(options.subtitle.trim(), width, sized(subSize, false)) : [];
  if (headLines.length > 4) overflow = true;

  const headBlock = headLines.length * headSize * 1.15;
  const subBlock = subLines.length ? 12 + subLines.length * subSize * 1.3 : 0;

  let y: number;
  const headTop = options.template === "band" ? 48 : options.template === "center" ? 72 : 64;
  const headColor = options.template === "band" ? onAccent(accent) : accent;
  const subColor = options.template === "band" ? onAccent(accent) : ink;
  const subOpacity = options.template === "band" ? "0.9" : "0.75";

  if (options.template === "band") {
    const bandH = headTop + headBlock + subBlock + 40;
    parts.push(`<rect width="${W}" height="${fmt(bandH)}" fill="${accent}"/>`);
    y = bandH + 28;
  } else if (options.template === "center") {
    parts.push(`<rect x="14" y="14" width="${W - 28}" height="${H - 28}" fill="none" stroke="${accent}" stroke-width="6" rx="6"/>`);
    y = 0;
  } else {
    parts.push(`<rect width="84" height="${H}" fill="${accent}"/>`);
    y = 0;
  }

  let cursor = headTop;
  headLines.forEach((line) => {
    parts.push(text(anchorX, cursor, headSize, line, `font-weight="700" fill="${headColor}"`));
    cursor += headSize * 1.15;
  });
  if (subLines.length) {
    cursor += 12;
    subLines.forEach((line) => {
      parts.push(text(anchorX, cursor, subSize, line, `fill="${subColor}" fill-opacity="${subOpacity}"`));
      cursor += subSize * 1.3;
    });
  }
  if (options.template !== "band") y = cursor + 28;

  if (options.imageDataUrl) {
    defs.push(`<clipPath id="photo"><rect x="${fmt(left)}" y="${fmt(y)}" width="${fmt(width)}" height="${IMAGE_HEIGHT}" rx="12"/></clipPath>`);
    parts.push(
      `<image href="${escapeXml(options.imageDataUrl)}" x="${fmt(left)}" y="${fmt(y)}" width="${fmt(width)}" height="${IMAGE_HEIGHT}" preserveAspectRatio="xMidYMid slice" clip-path="url(#photo)"/>`
    );
    y += IMAGE_HEIGHT + 24;
  }

  const bodySize = 16;
  const bodyLine = 24;
  if (options.body.trim()) {
    for (const line of wrapText(options.body.trim(), width, sized(bodySize, false))) {
      if (line !== "") parts.push(text(anchorX, y, bodySize, line, `fill="#1f2937"`));
      y += line === "" ? bodyLine * 0.6 : bodyLine;
    }
    y += 14;
  }

  const detailLines = options.details
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line !== "")
    .slice(0, FLYER_LIMITS.detailLines);
  const detailSize = 18;
  const dot = centered ? 0 : 18;
  for (const detail of detailLines) {
    const lines = wrapText(detail, width - dot, sized(detailSize, true));
    lines.forEach((line, index) => {
      if (!centered && index === 0) parts.push(`<circle cx="${fmt(left + 5)}" cy="${fmt(y + detailSize * 0.58)}" r="5" fill="${accent}"/>`);
      parts.push(text(centered ? anchorX : left + dot, y, detailSize, line, `font-weight="700" fill="${ink}"`));
      y += detailSize * 1.35;
    });
    y += 6;
  }

  const cta = options.cta.trim();
  const ctaSize = 22;
  const pillH = 52;
  const pillTop = H - 56 - pillH;
  if (cta) {
    const pillW = Math.min(width, measure(cta, ctaSize, stack, true) + 56);
    const pillX = centered ? (W - pillW) / 2 : left;
    parts.push(`<rect x="${fmt(pillX)}" y="${fmt(pillTop)}" width="${fmt(pillW)}" height="${pillH}" rx="${pillH / 2}" fill="${accent}"/>`);
    parts.push(
      `<text x="${fmt(pillX + pillW / 2)}" y="${fmt(pillTop + pillH / 2 + ctaSize * 0.34)}" text-anchor="middle" font-family="${stack}" font-size="${ctaSize}" font-weight="700" fill="${onAccent(accent)}">${escapeXml(cta)}</text>`
    );
    if (y > pillTop - 12) overflow = true;
  } else if (y > H - 50) {
    overflow = true;
  }

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${escapeXml(options.headline.trim())}">` +
    `<title>${escapeXml(options.headline.trim())}</title>${defs.length ? `<defs>${defs.join("")}</defs>` : ""}${parts.join("")}</svg>`;
  return { ok: true, svg, width: W, height: H, overflow };
}