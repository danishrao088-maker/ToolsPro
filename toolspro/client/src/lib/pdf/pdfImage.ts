import { MAX_PIXELS, outputFileName } from "../image/imageCore";
import { MAX_OUTPUT_SIDE } from "../image/svgSize";
import { rotationTargets, type RotateScope } from "./pdfCore";

export const MAX_RENDER_PAGES = 100; // ek baar mein itne pages tasveer banenge

export const DPI_OPTIONS = [
  { value: 72, label: "72 dpi (small files, for screens)" },
  { value: 96, label: "96 dpi" },
  { value: 150, label: "150 dpi (good for most uses)" },
  { value: 200, label: "200 dpi (sharper, bigger files)" },
];

export const PAGE_FORMATS = [
  { value: "image/jpeg" as const, label: "JPG", extension: "jpg" },
  { value: "image/png" as const, label: "PNG", extension: "png" },
];

export type SizeResult = { ok: true; scale: number; width: number; height: number } | { ok: false; error: string };

// PDF ki ikai "point" hai (1 inch = 72 points). widthPoints x heightPoints page ko dpi par kitne pixels milenge.
export function pageRenderSize(widthPoints: number, heightPoints: number, dpi: number): SizeResult {
  if (!(widthPoints > 0) || !(heightPoints > 0) || !(dpi > 0)) return { ok: false, error: "This page has no usable size." };
  const scale = dpi / 72;
  const width = Math.max(1, Math.round(widthPoints * scale));
  const height = Math.max(1, Math.round(heightPoints * scale));
  if (width > MAX_OUTPUT_SIDE || height > MAX_OUTPUT_SIDE || width * height > MAX_PIXELS) {
    return { ok: false, error: `A page would be ${width} × ${height} pixels, which is too big for your browser. Choose a lower resolution.` };
  }
  return { ok: true, scale, width, height };
}

// Kin pages ki tasveer banani hai (0 se shuru index). Ek baar mein MAX_RENDER_PAGES se zyada nahi.
export function renderTargets(scope: RotateScope, input: string, pageCount: number): { ok: true; pages: number[] } | { ok: false; error: string } {
  const targets = rotationTargets(scope, input, pageCount);
  if (!targets.ok) return targets;
  if (targets.pages.length > MAX_RENDER_PAGES) {
    return { ok: false, error: `You can convert up to ${MAX_RENDER_PAGES} pages at a time. Choose "Only the pages I choose" and pick fewer pages.` };
  }
  return targets;
}

// "report" + page 3 of 12 -> "report-page-03.jpg" (page number itne digits ka jitne total pages ke hon, taake tarteeb theek rahe)
export function pageImageName(base: string, pageIndex: number, pageCount: number, extension: string, used: Set<string>): string {
  const digits = String(pageCount).length;
  const number = String(pageIndex + 1).padStart(digits, "0");
  return outputFileName(`${base}-page-${number}.${extension}`, extension, used);
}