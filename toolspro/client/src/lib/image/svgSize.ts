import { MAX_PIXELS } from "./imageCore";

export const MAX_SVG_BYTES = 5 * 1024 * 1024;
export const MAX_OUTPUT_SIDE = 8192;

export type PreparedSvg = { ok: true; text: string; width: number; height: number } | { ok: false; error: string };

// Root <svg ...> tag. Quotes ke andar ">" aaye (jaise title="a>b") to bhi tag wahan khatam nahi hota.
const ROOT_TAG = /<svg\b(?:[^>"']|"[^"]*"|'[^']*')*>/i;

// SVG ki lambai ki ikaiyan (CSS pixels mein). %, em jaisi ikaiyan yahan nahi, wo size nahi batati.
const UNIT_TO_PX: Record<string, number> = {
  "": 1,
  px: 1,
  pt: 96 / 72,
  pc: 16,
  mm: 96 / 25.4,
  cm: 96 / 2.54,
  in: 96,
};

function readAttribute(tag: string, name: string): string | null {
  // Naam se pehle space zaroori hai, taake "stroke-width" ko "width" na samjha jaye
  const pattern = new RegExp(`\\s${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`, "i");
  const match = pattern.exec(tag);
  return match ? (match[1] ?? match[2] ?? "").trim() : null;
}

function parseLength(value: string | null): number | null {
  if (value === null) return null;
  const match = /^([+-]?(?:\d+\.?\d*|\.\d+))\s*(px|pt|pc|mm|cm|in)?$/i.exec(value);
  if (!match) return null;
  const factor = UNIT_TO_PX[(match[2] ?? "").toLowerCase()] ?? 1;
  const result = Number(match[1]) * factor;
  return Number.isFinite(result) && result > 0 ? result : null;
}

function parseViewBox(value: string | null): { width: number; height: number } | null {
  if (value === null) return null;
  const parts = value.split(/[\s,]+/).filter((part) => part !== "");
  if (parts.length !== 4) return null;
  const numbers = parts.map(Number);
  const width = numbers[2];
  const height = numbers[3];
  if (numbers.some((n) => !Number.isFinite(n)) || width === undefined || height === undefined) return null;
  return width > 0 && height > 0 ? { width, height } : null;
}

// Purani width/height hata kar sahi wali jorta hai
function setRootSize(tag: string, width: number, height: number): string {
  const w = Number(width.toFixed(3));
  const h = Number(height.toFixed(3));
  return tag
    .replace(/\s(?:width|height)\s*=\s*(?:"[^"]*"|'[^']*')/gi, "")
    .replace(/(\s*\/?>)$/, (end) => ` width="${w}" height="${h}"${end}`);
}

// SVG text ko sirf parhta hai (DOM mein kabhi nahi daalta). Size nikalta hai, aur zarurat ho to root tag mein
// width/height likh deta hai, kyunke kuch browsers bina size wali SVG ko theek se nahi banate.
export function prepareSvg(rawText: string): PreparedSvg {
  if (rawText.length > MAX_SVG_BYTES) return { ok: false, error: "This SVG is too large." };
  const text = rawText.replace(/^\uFEFF/, "");

  const match = ROOT_TAG.exec(text);
  if (!match) return { ok: false, error: "This file does not look like an SVG image." };
  const tag = match[0];

  const attrWidth = parseLength(readAttribute(tag, "width"));
  const attrHeight = parseLength(readAttribute(tag, "height"));
  const box = parseViewBox(readAttribute(tag, "viewBox"));

  let width: number;
  let height: number;
  if (attrWidth !== null && attrHeight !== null) {
    width = attrWidth;
    height = attrHeight;
  } else if (box) {
    if (attrWidth !== null) {
      width = attrWidth;
      height = (attrWidth * box.height) / box.width;
    } else if (attrHeight !== null) {
      height = attrHeight;
      width = (attrHeight * box.width) / box.height;
    } else {
      width = box.width;
      height = box.height;
    }
  } else {
    return { ok: false, error: "This SVG has no size. Add a width and height, or a viewBox, to the file." };
  }

  const complete = attrWidth !== null && attrHeight !== null;
  const prepared = complete ? text : text.replace(tag, () => setRootSize(tag, width, height));
  return { ok: true, text: prepared, width, height };
}

export type OutputSize = { ok: true; width: number; height: number } | { ok: false; error: string };

// targetWidth null = SVG ki apni size. Warna us chaurai par, aur oonchai nisbat se.
export function svgOutputSize(natural: { width: number; height: number }, targetWidth: number | null): OutputSize {
  const rawWidth = targetWidth ?? natural.width;
  const rawHeight = targetWidth === null ? natural.height : (targetWidth * natural.height) / natural.width;
  const width = Math.max(1, Math.round(rawWidth));
  const height = Math.max(1, Math.round(rawHeight));

  if (width > MAX_OUTPUT_SIDE || height > MAX_OUTPUT_SIDE) {
    return {
      ok: false,
      error: `The result would be ${width} × ${height} pixels. One side can be at most ${MAX_OUTPUT_SIDE} pixels. Choose a smaller width.`,
    };
  }
  if (width * height > MAX_PIXELS) {
    return { ok: false, error: "The result would have too many pixels. Choose a smaller width." };
  }
  return { ok: true, width, height };
}