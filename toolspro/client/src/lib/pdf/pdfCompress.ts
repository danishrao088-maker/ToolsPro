import { PDFDocument } from "pdf-lib";

// Compress PDF ka dil. Ye file pdf-lib istemal karti hai magar canvas ya DOM nahi, is liye iske tests node mein chalte hain.
// Do tareeqe hain:
//  1. "tidy": PDF ko saaf karke dobara likhna. Text wesa hi rehta hai, magar saving aksar chhoti hoti hai.
//  2. "pictures": har page ki JPEG tasveer bana kar nayi PDF banana. Bohat chhoti file milti hai, magar text select/search nahi hota.

export type PdfBytes = Uint8Array<ArrayBuffer>;

export interface LadderStep {
  dpi: number;
  quality: number;
}

// Behtar se kam-tar tarteeb. Neeche jaane par file chhoti hoti hai.
export const LADDER: readonly LadderStep[] = [
  { dpi: 150, quality: 80 },
  { dpi: 150, quality: 65 },
  { dpi: 130, quality: 65 },
  { dpi: 120, quality: 55 },
  { dpi: 100, quality: 60 },
  { dpi: 100, quality: 45 },
  { dpi: 85, quality: 50 },
  { dpi: 72, quality: 45 },
  { dpi: 72, quality: 35 },
  { dpi: 60, quality: 30 },
  { dpi: 50, quality: 25 },
  { dpi: 40, quality: 20 },
];

export type CompressLevel = "keep-text" | "good" | "balanced" | "strong" | "smallest";

export const LEVELS: { value: CompressLevel; label: string; hint: string; step: number | null }[] = [
  { value: "keep-text", label: "Keep the text (light)", hint: "Text stays selectable. The file may get only a little smaller.", step: null },
  { value: "good", label: "Good quality", hint: "Pages become pictures at a sharp resolution.", step: 0 },
  { value: "balanced", label: "Balanced", hint: "Pages become pictures. A good mix of size and clarity.", step: 3 },
  { value: "strong", label: "Strong", hint: "Pages become pictures. Small file, softer text.", step: 6 },
  { value: "smallest", label: "Smallest", hint: "Pages become pictures. Very small file, text may be hard to read.", step: 9 },
];

export const MIN_READABLE_DPI = 72;

export interface RenderedJpeg {
  jpeg: Uint8Array;
  width: number; // pixels
  height: number;
}

export type RenderResult = { ok: true; image: RenderedJpeg } | { ok: false; error: string };
export type PageRenderer = (pageIndex: number, dpi: number, qualityPercent: number) => Promise<RenderResult>;

const toBytes = (data: Uint8Array): PdfBytes => new Uint8Array(data);

// Har page ek JPEG tasveer hai. Page ka size (points mein) = pixels * 72 / dpi.
export async function buildImagePdf(images: readonly (RenderedJpeg & { dpi: number })[]): Promise<PdfBytes> {
  const doc = await PDFDocument.create({ updateMetadata: false });
  for (const item of images) {
    // pdf-lib JPEG ko uske poore buffer se parhta hai, is liye tukra (view) ho to pehle alag copy bana lete hain
    const jpeg = item.jpeg.byteOffset === 0 && item.jpeg.byteLength === item.jpeg.buffer.byteLength ? item.jpeg : item.jpeg.slice();
    const embedded = await doc.embedJpg(jpeg);
    const width = (item.width * 72) / item.dpi;
    const height = (item.height * 72) / item.dpi;
    const page = doc.addPage([width, height]);
    page.drawImage(embedded, { x: 0, y: 0, width, height });
  }
  return toBytes(await doc.save({ useObjectStreams: true }));
}

// Text rakhte hue PDF ko saaf karke dobara likhta hai
export async function tidyPdf(bytes: Uint8Array): Promise<PdfBytes> {
  const doc = await PDFDocument.load(bytes, { updateMetadata: false });
  return toBytes(await doc.save({ useObjectStreams: true }));
}

export interface SearchResult {
  index: number;
  reached: boolean;
}

// Wo sab se behtar (sab se pehla) qadam dhoondta hai jis ka size target ke andar ho. Qadam jitna neeche, size utna kam.
// Agar koi bhi na pahunche to aakhri (sab se chhota) qadam deta hai.
export async function searchLadder(length: number, target: number, probe: (index: number) => Promise<number>): Promise<SearchResult> {
  let low = 0;
  let high = length - 1;
  let best = -1;
  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const size = await probe(mid);
    if (size <= target) {
      best = mid;
      high = mid - 1;
    } else {
      low = mid + 1;
    }
  }
  return best >= 0 ? { index: best, reached: true } : { index: length - 1, reached: false };
}

export interface CompressProgress {
  attempt: number;
  page: number;
  pages: number;
}

export interface CompressInput {
  bytes: Uint8Array;
  pageCount: number;
  render: PageRenderer;
  onProgress?: (progress: CompressProgress) => void;
  signal?: AbortSignal;
}

export type CompressRequest = { kind: "level"; level: CompressLevel } | { kind: "target"; targetBytes: number };

export type CompressOutcome =
  | {
      ok: true;
      bytes: Uint8Array;
      method: "unchanged" | "tidy" | "pictures";
      beforeBytes: number;
      afterBytes: number;
      reachedTarget: boolean | null; // sirf target wale tools mein
      step: LadderStep | null;
      notes: string[];
    }
  | { ok: false; error: string; cancelled: boolean };

export const MAX_RASTER_PAGES = 100;

class Cancelled extends Error {}
class RenderFailed extends Error {}

export async function compressPdf(input: CompressInput, request: CompressRequest): Promise<CompressOutcome> {
  const before = input.bytes.length;
  const notes: string[] = [];
  let attempt = 0;

  const fail = (error: string): CompressOutcome => ({ ok: false, error, cancelled: false });
  const unchanged = (reachedTarget: boolean | null, note: string): CompressOutcome => ({
    ok: true, bytes: input.bytes, method: "unchanged", beforeBytes: before, afterBytes: before, reachedTarget, step: null, notes: [...notes, note],
  });

  async function tidy(): Promise<PdfBytes | null> {
    try {
      return await tidyPdf(input.bytes);
    } catch {
      return null;
    }
  }

  // Ek qadam par saare pages ki tasveer bana kar PDF banata hai
  async function raster(step: LadderStep): Promise<PdfBytes> {
    attempt += 1;
    const images: (RenderedJpeg & { dpi: number })[] = [];
    for (let i = 0; i < input.pageCount; i += 1) {
      if (input.signal?.aborted) throw new Cancelled();
      input.onProgress?.({ attempt, page: i + 1, pages: input.pageCount });
      const result = await input.render(i, step.dpi, step.quality);
      if (!result.ok) throw new RenderFailed(result.error);
      images.push({ ...result.image, dpi: step.dpi });
    }
    return buildImagePdf(images);
  }

  try {
    if (request.kind === "level") {
      const level = LEVELS.find((item) => item.value === request.level);
      if (!level) return fail("Choose a compression level.");
      if (level.step === null) {
        const tidied = await tidy();
        if (!tidied) return fail("This PDF could not be read. It may be damaged or protected with a password.");
        if (tidied.length >= before) return unchanged(null, "This PDF is already compact, so it was left as it is.");
        return { ok: true, bytes: tidied, method: "tidy", beforeBytes: before, afterBytes: tidied.length, reachedTarget: null, step: null, notes: ["The text is still selectable."] };
      }
      if (input.pageCount > MAX_RASTER_PAGES) return fail(`This level turns pages into pictures, which works for up to ${MAX_RASTER_PAGES} pages. Choose "Keep the text (light)" for longer PDFs.`);
      const step = LADDER[level.step]!;
      const built = await raster(step);
      if (built.length >= before) return unchanged(null, "Turning the pages into pictures would not make this PDF smaller, so it was left as it is.");
      return { ok: true, bytes: built, method: "pictures", beforeBytes: before, afterBytes: built.length, reachedTarget: null, step, notes: ["The text is now part of the picture, so it cannot be selected or searched."] };
    }

    const target = request.targetBytes;
    if (before <= target) return unchanged(true, "This PDF is already smaller than the target, so it was left as it is.");

    const tidied = await tidy();
    if (tidied && tidied.length <= target) {
      return { ok: true, bytes: tidied, method: "tidy", beforeBytes: before, afterBytes: tidied.length, reachedTarget: true, step: null, notes: ["The text is still selectable."] };
    }

    if (input.pageCount > MAX_RASTER_PAGES) {
      return fail(`To reach this size the pages must become pictures, which works for up to ${MAX_RASTER_PAGES} pages. This PDF has ${input.pageCount}.`);
    }

    const kept = new Map<number, PdfBytes>();
    const sizes = new Map<number, number>();
    const found = await searchLadder(LADDER.length, target, async (index) => {
      const built = await raster(LADDER[index]!);
      sizes.set(index, built.length);
      if (built.length <= target || index === LADDER.length - 1) kept.set(index, built);
      return built.length;
    });

    const built = kept.get(found.index);
    const step = LADDER[found.index]!;
    if (!built) return fail("The PDF could not be compressed.");
    if (!found.reached && built.length >= before) return unchanged(false, "The target could not be reached, and the smallest version we could make was not smaller than the original.");
    if (step.dpi < MIN_READABLE_DPI) notes.push("The pages are very low resolution, so small text may be hard to read.");
    notes.push("The text is now part of the picture, so it cannot be selected or searched.");
    return { ok: true, bytes: built, method: "pictures", beforeBytes: before, afterBytes: built.length, reachedTarget: found.reached, step, notes };
  } catch (error) {
    if (error instanceof Cancelled) return { ok: false, error: "Stopped.", cancelled: true };
    if (error instanceof RenderFailed) return fail(error.message);
    return fail("The PDF could not be compressed. It may be damaged, or your browser may be out of memory.");
  }
}