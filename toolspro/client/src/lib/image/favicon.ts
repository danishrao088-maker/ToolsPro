import { detectImageType, validateImageFile, type FileCheck } from "./imageCore";
import { MAX_SVG_BYTES } from "./svgSize";

export type FitMode = "fit" | "fill";

export const FIT_OPTIONS: { value: FitMode; label: string }[] = [
  { value: "fit", label: "Fit: show the whole picture, with empty space if needed" },
  { value: "fill", label: "Fill: fill the square and crop the edges" },
];

// Har size sirf ek baar banta hai. Sirf Apple wala (180) opaque hai.
export const ICON_SIZES = [16, 32, 48, 180, 192, 512] as const;
export const ICO_SIZES = [16, 32, 48] as const;
export const APPLE_SIZE = 180;

export interface FaviconFileSpec {
  name: string;
  size: number;
}

export const PNG_FILES: FaviconFileSpec[] = [
  { name: "favicon-16x16.png", size: 16 },
  { name: "favicon-32x32.png", size: 32 },
  { name: "apple-touch-icon.png", size: APPLE_SIZE },
  { name: "icon-192.png", size: 192 },
  { name: "icon-512.png", size: 512 },
];

export const HEAD_SNIPPET = [
  '<link rel="icon" href="/favicon.ico" sizes="48x48">',
  '<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">',
  '<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">',
  '<link rel="apple-touch-icon" href="/apple-touch-icon.png">',
].join("\n");

// Tasveer ko size x size ke dabbe mein kahan aur kitni bari draw karna hai
export function iconPlacement(
  sourceWidth: number,
  sourceHeight: number,
  size: number,
  mode: FitMode
): { x: number; y: number; width: number; height: number } {
  const scale = mode === "fit" ? size / Math.max(sourceWidth, sourceHeight) : size / Math.min(sourceWidth, sourceHeight);
  const width = sourceWidth * scale;
  const height = sourceHeight * scale;
  return { x: (size - width) / 2, y: (size - height) / 2, width, height };
}

// Icon ki source file: SVG bhi chalti hai (iski size ki hadd alag hai), baqi tasveerein wohi jo Step 19 mein thi
export function validateIconSource(file: { name: string; size: number; type: string }): FileCheck {
  const type = detectImageType(file);
  if (type === "image/svg+xml") {
    if (file.size === 0) return { ok: false, error: `"${file.name}" is empty.` };
    if (file.size > MAX_SVG_BYTES) return { ok: false, error: `"${file.name}" is too large.` };
    return { ok: true, type };
  }
  return validateImageFile(file);
}