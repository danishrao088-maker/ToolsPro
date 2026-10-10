import { isHexColor, luminance } from "../qr/qrColor";
import { escapeXml } from "../word/docx";

export type LogoLayout = "stacked" | "side" | "text";
export type LogoIcon = "circle" | "square" | "hexagon" | "diamond" | "triangle" | "shield" | "star";
export type LogoFont = "sans" | "serif" | "mono" | "rounded";

export const LOGO_LAYOUTS: { value: LogoLayout; label: string }[] = [
  { value: "stacked", label: "Symbol above the name" },
  { value: "side", label: "Symbol beside the name" },
  { value: "text", label: "Name only" },
];

export const LOGO_ICONS: { value: LogoIcon; label: string }[] = [
  { value: "circle", label: "Circle" },
  { value: "square", label: "Rounded square" },
  { value: "hexagon", label: "Hexagon" },
  { value: "diamond", label: "Diamond" },
  { value: "triangle", label: "Triangle" },
  { value: "shield", label: "Shield" },
  { value: "star", label: "Star" },
];

// Sirf wo fonts jo har computer mein hote hain. Koi font bahar se load nahi hota.
export const LOGO_FONTS: { value: LogoFont; label: string; stack: string }[] = [
  { value: "sans", label: "Clean (sans-serif)", stack: "'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif" },
  { value: "serif", label: "Classic (serif)", stack: "Georgia, 'Times New Roman', serif" },
  { value: "rounded", label: "Friendly", stack: "'Trebuchet MS', Verdana, sans-serif" },
  { value: "mono", label: "Technical (monospace)", stack: "'Courier New', Consolas, monospace" },
];

export const MAX_NAME_LENGTH = 40;
export const MAX_TAGLINE_LENGTH = 60;

export interface LogoOptions {
  name: string;
  tagline: string;
  layout: LogoLayout;
  icon: LogoIcon;
  initials: boolean; // symbol ke andar naam ke pehle huroof
  font: LogoFont;
  bold: boolean;
  iconColor: string;
  textColor: string;
  background: string | null; // null = transparent
}

export const DEFAULT_LOGO: LogoOptions = {
  name: "",
  tagline: "",
  layout: "stacked",
  icon: "hexagon",
  initials: true,
  font: "sans",
  bold: true,
  iconColor: "#1d4ed8",
  textColor: "#111827",
  background: null,
};

// Text ki chaurai naapne wala function (browser mein canvas se, tests mein jhootha)
export type MeasureText = (text: string, fontSize: number, fontStack: string, bold: boolean) => number;

export type LogoResult = { ok: true; svg: string; width: number; height: number } | { ok: false; error: string };

const NAME_SIZE = 64;
const TAGLINE_SIZE = 24;
const ICON_SIZE = 100;
const GAP = 24;
const PADDING = 40;

// Naam ke pehle (aksar do) huroof: "Blue Sky Studio" -> "BS". Khali ho to khali.
export function initialsOf(name: string): string {
  const words = name.trim().split(/\s+/).filter((word) => word !== "");
  const letters = words.map((word) => Array.from(word)[0] ?? "");
  return letters.slice(0, 2).join("").toUpperCase();
}

function starPoints(): string {
  const points: string[] = [];
  for (let i = 0; i < 10; i += 1) {
    const radius = i % 2 === 0 ? 48 : 20;
    const angle = ((-90 + i * 36) * Math.PI) / 180;
    points.push(`${(50 + radius * Math.cos(angle)).toFixed(2)},${(50 + radius * Math.sin(angle)).toFixed(2)}`);
  }
  return points.join(" ");
}

// 100 x 100 ke dabbe mein shakal
function shapeMarkup(icon: LogoIcon, color: string): string {
  switch (icon) {
    case "circle":
      return `<circle cx="50" cy="50" r="48" fill="${color}"/>`;
    case "square":
      return `<rect x="2" y="2" width="96" height="96" rx="22" fill="${color}"/>`;
    case "hexagon":
      return `<polygon points="50,2 92,26 92,74 50,98 8,74 8,26" fill="${color}"/>`;
    case "diamond":
      return `<polygon points="50,2 98,50 50,98 2,50" fill="${color}"/>`;
    case "triangle":
      return `<polygon points="50,4 97,92 3,92" fill="${color}"/>`;
    case "shield":
      return `<path d="M50 3 L90 16 V50 C90 74 72 90 50 98 C28 90 10 74 10 50 V16 Z" fill="${color}"/>`;
    case "star":
      return `<polygon points="${starPoints()}" fill="${color}"/>`;
  }
}

// Symbol ke andar likhe huroof ka rang: gehre symbol par safed, halke par kala
function contrastText(background: string): string {
  return luminance(background) > 0.4 ? "#111827" : "#ffffff";
}

function validate(options: LogoOptions): string {
  if (options.name.trim() === "") return "Type a name for the logo.";
  if (Array.from(options.name).length > MAX_NAME_LENGTH) return `The name can have up to ${MAX_NAME_LENGTH} characters.`;
  if (Array.from(options.tagline).length > MAX_TAGLINE_LENGTH) return `The tagline can have up to ${MAX_TAGLINE_LENGTH} characters.`;
  if (!isHexColor(options.iconColor) || !isHexColor(options.textColor)) return "Colors must look like #1d4ed8.";
  if (options.background !== null && !isHexColor(options.background)) return "Colors must look like #1d4ed8.";
  return "";
}

const fmt = (value: number) => String(Math.round(value * 100) / 100);

export function buildLogoSvg(options: LogoOptions, measure: MeasureText): LogoResult {
  const problem = validate(options);
  if (problem) return { ok: false, error: problem };

  const name = options.name.trim();
  const tagline = options.tagline.trim();
  const stack = LOGO_FONTS.find((f) => f.value === options.font)?.stack ?? LOGO_FONTS[0]!.stack;
  const weight = options.bold ? 700 : 400;
  const nameWidth = measure(name, NAME_SIZE, stack, options.bold);
  const tagWidth = tagline ? measure(tagline, TAGLINE_SIZE, stack, false) : 0;
  const textWidth = Math.max(nameWidth, tagWidth);
  const nameLine = NAME_SIZE * 1.15;
  const tagLine = tagline ? 8 + TAGLINE_SIZE * 1.15 : 0;
  const textHeight = nameLine + tagLine;
  const hasIcon = options.layout !== "text";

  let width: number;
  let height: number;
  let iconX = 0;
  let iconY = 0;
  let textCenterX: number;
  let textTop: number;

  if (options.layout === "stacked") {
    const inner = Math.max(ICON_SIZE, textWidth);
    width = inner + PADDING * 2;
    height = PADDING * 2 + ICON_SIZE + GAP + textHeight;
    iconX = (width - ICON_SIZE) / 2;
    iconY = PADDING;
    textCenterX = width / 2;
    textTop = PADDING + ICON_SIZE + GAP;
  } else if (options.layout === "side") {
    const inner = Math.max(ICON_SIZE, textHeight);
    width = PADDING * 2 + ICON_SIZE + GAP + textWidth;
    height = PADDING * 2 + inner;
    iconX = PADDING;
    iconY = (height - ICON_SIZE) / 2;
    textCenterX = PADDING + ICON_SIZE + GAP + textWidth / 2;
    textTop = (height - textHeight) / 2;
  } else {
    width = PADDING * 2 + textWidth;
    height = PADDING * 2 + textHeight;
    textCenterX = width / 2;
    textTop = PADDING;
  }

  width = Math.ceil(width);
  height = Math.ceil(height);

  const parts: string[] = [];
  if (options.background) parts.push(`<rect width="${width}" height="${height}" fill="${options.background}"/>`);

  if (hasIcon) {
    parts.push(`<g transform="translate(${fmt(iconX)} ${fmt(iconY)}) scale(${ICON_SIZE / 100})">${shapeMarkup(options.icon, options.iconColor)}</g>`);
    const letters = options.initials ? initialsOf(name) : "";
    if (letters) {
      const size = letters.length > 1 ? 38 : 48;
      parts.push(
        `<text x="${fmt(iconX + ICON_SIZE / 2)}" y="${fmt(iconY + ICON_SIZE / 2 + size * 0.35)}" text-anchor="middle" font-family="${stack}" font-weight="700" font-size="${size}" fill="${contrastText(options.iconColor)}">${escapeXml(letters)}</text>`
      );
    }
  }

  parts.push(
    `<text x="${fmt(textCenterX)}" y="${fmt(textTop + NAME_SIZE * 0.88)}" text-anchor="middle" font-family="${stack}" font-weight="${weight}" font-size="${NAME_SIZE}" fill="${options.textColor}">${escapeXml(name)}</text>`
  );
  if (tagline) {
    parts.push(
      `<text x="${fmt(textCenterX)}" y="${fmt(textTop + nameLine + 8 + TAGLINE_SIZE * 0.88)}" text-anchor="middle" font-family="${stack}" font-size="${TAGLINE_SIZE}" fill="${options.textColor}" fill-opacity="0.75">${escapeXml(tagline)}</text>`
    );
  }

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeXml(name)}">` +
    `<title>${escapeXml(name)}</title>${parts.join("")}</svg>`;
  return { ok: true, svg, width, height };
}