export const MAX_FILES = 20;
export const MAX_FILE_BYTES = 30 * 1024 * 1024;
export const MAX_PIXELS = 50_000_000;

export type OutputMime = "image/jpeg" | "image/png" | "image/webp";

export interface OutputFormat {
  mime: OutputMime;
  label: string;
  extension: string;
  lossy: boolean; // quality sirf lossy formats par asar karti hai
}

export const OUTPUT_FORMATS: OutputFormat[] = [
  { mime: "image/jpeg", label: "JPG", extension: "jpg", lossy: true },
  { mime: "image/png", label: "PNG", extension: "png", lossy: false },
  { mime: "image/webp", label: "WebP", extension: "webp", lossy: true },
];

export function getOutputFormat(mime: string): OutputFormat | undefined {
  return OUTPUT_FORMATS.find((format) => format.mime === mime);
}

const INPUT_TYPES: ReadonlySet<string> = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/bmp",
  "image/avif",
]);

const EXTENSION_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  bmp: "image/bmp",
  avif: "image/avif",
  svg: "image/svg+xml",
};

export interface FileLike {
  name: string;
  size: number;
  type: string;
}

// Browser ka bataya hua type pehle; wo khali ho (Windows par aksar hota hai) to extension dekhte hain
export function detectImageType(file: Pick<FileLike, "name" | "type">): string {
  if (file.type !== "") return file.type;
  const dot = file.name.lastIndexOf(".");
  const extension = dot === -1 ? "" : file.name.slice(dot + 1).toLowerCase();
  return EXTENSION_TYPES[extension] ?? "";
}

export type FileCheck = { ok: true; type: string } | { ok: false; error: string };

// Ye sirf pehli chhanni hai. Asal faisla tab hota hai jab browser file ko khol (decode) kar dekhta hai.
export function validateImageFile(file: FileLike): FileCheck {
  const type = detectImageType(file);
  if (type === "image/svg+xml") return { ok: false, error: `"${file.name}" is an SVG file, which this tool does not support.` };
  if (!INPUT_TYPES.has(type)) {
    return { ok: false, error: `"${file.name}" is not a supported image. Use JPG, PNG, WebP, GIF, BMP or AVIF.` };
  }
  if (file.size === 0) return { ok: false, error: `"${file.name}" is empty.` };
  if (file.size > MAX_FILE_BYTES) {
    return { ok: false, error: `"${file.name}" is too large. The maximum is ${formatBytes(MAX_FILE_BYTES)} per file.` };
  }
  return { ok: true, type };
}

// "photo.png" -> "photo.jpg". Unsafe characters hat jate hain, aur ek hi naam do baar aaye to -2, -3 lagta hai.
export function outputFileName(original: string, extension: string, used: Set<string>): string {
  const dot = original.lastIndexOf(".");
  const rawBase = dot > 0 ? original.slice(0, dot) : original;
  const base =
    rawBase
      .replace(/[^\p{L}\p{N} ._()-]/gu, "_")
      .replace(/^\.+/, "")
      .replace(/[. ]+$/, "")
      .trim()
      .slice(0, 100) || "image";

  let candidate = `${base}.${extension}`;
  let counter = 2;
  while (used.has(candidate.toLowerCase())) {
    candidate = `${base}-${counter}.${extension}`;
    counter += 1;
  }
  used.add(candidate.toLowerCase());
  return candidate;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb < 10 ? kb.toFixed(1) : Math.round(kb)} KB`;
  const mb = kb / 1024;
  return `${mb < 10 ? mb.toFixed(1) : Math.round(mb)} MB`;
}

// Lambi side maxSide se bari ho to dono ko ek hi nisbat se chhota karta hai
export function fitWithin(width: number, height: number, maxSide: number | null): { width: number; height: number } {
  const longest = Math.max(width, height);
  if (maxSide === null || longest <= maxSide) return { width, height };
  const scale = maxSide / longest;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

export function describeChange(before: number, after: number): string {
  if (before <= 0) return "";
  const percent = Math.round(((after - before) / before) * 100);
  if (percent === 0) return "about the same size";
  return percent < 0 ? `${-percent}% smaller` : `${percent}% larger`;
}

export type CompressFormatChoice = "keep" | OutputMime;

export function resolveCompressFormat(inputType: string, choice: CompressFormatChoice): { mime: OutputMime; note: string } {
  if (choice !== "keep") return { mime: choice, note: "" };
  if (inputType === "image/jpeg" || inputType === "image/png" || inputType === "image/webp") {
    return { mime: inputType, note: "" };
  }
  return { mime: "image/jpeg", note: "Saved as JPG, because this type cannot be kept." };
}

// Slider ka 1-100 -> canvas ka 0.01-1
export function qualityValue(percent: number): number {
  if (!Number.isFinite(percent)) return 0.8;
  return Math.min(1, Math.max(0.01, Math.round(percent) / 100));
}