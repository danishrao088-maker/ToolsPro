export const MAX_PDF_FILES = 20;
export const MAX_PDF_BYTES = 50 * 1024 * 1024;
export const MAX_TOTAL_BYTES = 200 * 1024 * 1024;
export const MAX_PAGES = 2000; // ek PDF mein aur ek natije mein
export const MAX_SPLIT_FILES = 200; // split se ek baar mein itni PDFs

export type PdfCheck = { ok: true } | { ok: false; error: string };

// Ye sirf pehli chhanni hai. Asal faisla tab hota hai jab PDF library file ko kholti hai.
export function validatePdfFile(file: { name: string; size: number; type: string }): PdfCheck {
  const looksLikePdf = file.type === "application/pdf" || /\.pdf$/i.test(file.name);
  if (!looksLikePdf) return { ok: false, error: `"${file.name}" is not a PDF file.` };
  if (file.size === 0) return { ok: false, error: `"${file.name}" is empty.` };
  if (file.size > MAX_PDF_BYTES) {
    return { ok: false, error: `"${file.name}" is too large. The maximum is ${Math.round(MAX_PDF_BYTES / 1024 / 1024)} MB per file.` };
  }
  return { ok: true };
}

// PDF "%PDF-" se shuru hoti hai. Standard pehle 1024 bytes ke andar kahin bhi allow karta hai.
export function hasPdfHeader(bytes: Uint8Array): boolean {
  const limit = Math.min(bytes.length, 1024) - 4;
  for (let i = 0; i < limit; i += 1) {
    if (bytes[i] === 0x25 && bytes[i + 1] === 0x50 && bytes[i + 2] === 0x44 && bytes[i + 3] === 0x46 && bytes[i + 4] === 0x2d) return true;
  }
  return false;
}

export type PagesResult = { ok: true; groups: number[][] } | { ok: false; error: string };

// "1-3, 5, 8-" -> [[0,1,2],[4],[7,8,9]] (0 se shuru hone wale page index, har comma ka alag group)
export function parsePageRanges(input: string, pageCount: number): PagesResult {
  const parts = input
    .split(",")
    .map((part) => part.trim())
    .filter((part) => part !== "");
  if (parts.length === 0) return { ok: false, error: "Enter the pages you want, for example 1-3, 5, 8-" };

  const groups: number[][] = [];
  let total = 0;
  for (const part of parts) {
    const single = /^(\d+)$/.exec(part);
    const range = /^(\d+)\s*-\s*(\d*)$/.exec(part);
    let start: number;
    let end: number;
    if (single) {
      start = Number(single[1]);
      end = start;
    } else if (range) {
      start = Number(range[1]);
      end = range[2] === "" ? pageCount : Number(range[2]);
    } else {
      return { ok: false, error: `"${part}" is not a valid page or range. Use numbers like 3 or 2-5.` };
    }

    if (start < 1 || start > pageCount) return { ok: false, error: `Page ${start} does not exist. This PDF has ${pageCount} ${pageCount === 1 ? "page" : "pages"}.` };
    if (end < 1 || end > pageCount) return { ok: false, error: `Page ${end} does not exist. This PDF has ${pageCount} ${pageCount === 1 ? "page" : "pages"}.` };
    if (start > end) return { ok: false, error: `"${part}" goes backwards. Write the smaller page number first.` };

    total += end - start + 1;
    if (total > MAX_PAGES) return { ok: false, error: `You selected too many pages. The maximum is ${MAX_PAGES}.` };
    groups.push(Array.from({ length: end - start + 1 }, (_, i) => start - 1 + i));
  }
  return { ok: true, groups };
}

export type SplitMode = "ranges-separate" | "ranges-one" | "every-page";

export const SPLIT_MODES: { value: SplitMode; label: string }[] = [
  { value: "ranges-separate", label: "Each range as its own PDF" },
  { value: "ranges-one", label: "All chosen pages in one PDF" },
  { value: "every-page", label: "Every page as its own PDF" },
];

// Natija: har group ek nayi PDF banata hai
export function planSplit(mode: SplitMode, input: string, pageCount: number): PagesResult {
  let result: PagesResult;
  if (mode === "every-page") {
    result = { ok: true, groups: Array.from({ length: pageCount }, (_, i) => [i]) };
  } else {
    const parsed = parsePageRanges(input, pageCount);
    if (!parsed.ok) return parsed;
    result = mode === "ranges-one" ? { ok: true, groups: [parsed.groups.flat()] } : parsed;
  }
  if (result.groups.length > MAX_SPLIT_FILES) {
    return { ok: false, error: `This would create more than ${MAX_SPLIT_FILES} files. Choose fewer pages or ranges.` };
  }
  return result;
}

// File ke naam ka hissa: "page-5", "pages-1-3", ya jore na hue pages ke liye "pages-1_4_7"
export function groupLabel(group: number[]): string {
  const numbers = group.map((index) => index + 1);
  const first = numbers[0];
  const last = numbers[numbers.length - 1];
  if (first === undefined || last === undefined) return "pages";
  if (numbers.length === 1) return `page-${first}`;
  const contiguous = numbers.every((n, i) => n === first + i);
  if (contiguous) return `pages-${first}-${last}`;
  const shown = numbers.slice(0, 5).join("_");
  return `pages-${shown}${numbers.length > 5 ? "_etc" : ""}`;
}

export type RotateAngle = 90 | 180 | 270;

export const ROTATE_ANGLES: { value: RotateAngle; label: string }[] = [
  { value: 90, label: "90° clockwise" },
  { value: 180, label: "180°" },
  { value: 270, label: "90° counter-clockwise" },
];

// PDF page ki maujooda rotation (kabhi negative ya 360 se zyada) mein naya angle jorta hai
export function addRotation(current: number, delta: RotateAngle): number {
  return (((current + delta) % 360) + 360) % 360;
}

export type RotateScope = "all" | "range";

// Kin pages ko ghumana hai (0 se shuru index, ek baar, tarteeb se)
export function rotationTargets(scope: RotateScope, input: string, pageCount: number): { ok: true; pages: number[] } | { ok: false; error: string } {
  if (scope === "all") return { ok: true, pages: Array.from({ length: pageCount }, (_, i) => i) };
  const parsed = parsePageRanges(input, pageCount);
  if (!parsed.ok) return parsed;
  return { ok: true, pages: [...new Set(parsed.groups.flat())].sort((a, b) => a - b) };
}

// List mein ek cheez ko dusri jagah le jata hai (purani list ko chheda nahi jata)
export function moveItem<T>(list: readonly T[], from: number, to: number): T[] {
  const copy = [...list];
  if (from < 0 || from >= copy.length || to < 0 || to >= copy.length || from === to) return copy;
  const [item] = copy.splice(from, 1);
  if (item !== undefined) copy.splice(to, 0, item);
  return copy;
}

export function totalSize(files: readonly { size: number }[]): number {
  return files.reduce((sum, file) => sum + file.size, 0);
}

// "report.PDF" -> "report" (file ke naam mein naya hissa jorne ke liye)
export function baseName(name: string): string {
  return name.replace(/\.pdf$/i, "");
}