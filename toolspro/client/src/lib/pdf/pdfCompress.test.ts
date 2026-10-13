import { PDFDocument } from "pdf-lib";
import { describe, expect, it } from "vitest";
import {
  LADDER,
  LEVELS,
  MAX_RASTER_PAGES,
  buildImagePdf,
  compressPdf,
  searchLadder,
  tidyPdf,
  type PageRenderer,
  type RenderedJpeg,
} from "./pdfCompress";

// Nakli chhota JPEG: sirf wo hissa jo pdf-lib parhta hai (SOI, SOF0 mein 16x8 pixel aur 3 rang, EOI). Tests ko tasveer dekhni nahi, sirf PDF ka dhancha.
const TINY_JPEG = Uint8Array.from([0xff, 0xd8, 0xff, 0xc0, 0x00, 0x11, 0x08, 0x00, 0x08, 0x00, 0x10, 0x03, 0x01, 0x22, 0x00, 0x02, 0x11, 0x01, 0x03, 0x11, 0x01, 0xff, 0xd9]);

// JPEG mein "comment" tukra jor kar size badhata hai (ye JPEG ke andar jayez hai), taake size dpi aur quality ke saath badle
function paddedJpeg(extra: number): Uint8Array {
  const length = extra + 2; // length field khud bhi 2 bytes
  const comment = new Uint8Array(4 + extra);
  comment[0] = 0xff;
  comment[1] = 0xfe;
  comment[2] = (length >> 8) & 0xff;
  comment[3] = length & 0xff;
  const out = new Uint8Array(2 + comment.length + TINY_JPEG.length - 2);
  out.set(TINY_JPEG.subarray(0, 2), 0);
  out.set(comment, 2);
  out.set(TINY_JPEG.subarray(2), 2 + comment.length);
  return out;
}

const imageFor = (dpi: number, quality: number): RenderedJpeg => ({ jpeg: paddedJpeg(dpi * quality), width: 16, height: 8 });
const renderer: PageRenderer = async (_page, dpi, quality) => ({ ok: true, image: imageFor(dpi, quality) });

const dummy = (size: number) => new Uint8Array(size); // asli PDF nahi: "tidy" is par fail hota hai, tasveer wala raasta chalta hai

async function realPdf(pages: number): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  for (let i = 0; i < pages; i += 1) doc.addPage([300, 300]).drawText(`Page ${i + 1} hello hello hello`);
  return doc.save({ useObjectStreams: false });
}

describe("ladder and levels", () => {
  it("gets smaller step by step", () => {
    for (let i = 1; i < LADDER.length; i += 1) {
      expect(LADDER[i]!.dpi * LADDER[i]!.quality).toBeLessThan(LADDER[i - 1]!.dpi * LADDER[i - 1]!.quality);
    }
  });
  it("points every level at a real step", () => {
    for (const level of LEVELS) if (level.step !== null) expect(LADDER[level.step]).toBeDefined();
    expect(LEVELS.map((l) => l.step)).toEqual([null, 0, 3, 6, 9]);
  });
});

describe("buildImagePdf", () => {
  it("makes one page per picture with the right page size", async () => {
    const bytes = await buildImagePdf([
      { ...imageFor(100, 50), width: 800, height: 400, dpi: 100 },
      { ...imageFor(72, 50), width: 144, height: 72, dpi: 72 },
    ]);
    const doc = await PDFDocument.load(bytes);
    expect(doc.getPageCount()).toBe(2);
    expect(doc.getPage(0).getSize()).toEqual({ width: 576, height: 288 });
    expect(doc.getPage(1).getSize()).toEqual({ width: 144, height: 72 });
    expect(String.fromCharCode(...bytes.subarray(0, 5))).toBe("%PDF-");
  });
});

describe("buildImagePdf with a view of a bigger buffer", () => {
  it("still embeds the right picture", async () => {
    const jpeg = paddedJpeg(100);
    const holder = new Uint8Array(jpeg.length + 40);
    holder.set(jpeg, 20);
    const view = holder.subarray(20, 20 + jpeg.length);
    const bytes = await buildImagePdf([{ jpeg: view, width: 16, height: 8, dpi: 72 }]);
    expect((await PDFDocument.load(bytes)).getPageCount()).toBe(1);
  });
});

describe("tidyPdf", () => {
  it("rewrites a PDF so it is smaller and still opens", async () => {
    const original = await realPdf(30);
    const tidy = await tidyPdf(original);
    expect(tidy.length).toBeLessThan(original.length);
    expect((await PDFDocument.load(tidy)).getPageCount()).toBe(30);
  });
  it("throws for something that is not a PDF", async () => {
    await expect(tidyPdf(dummy(100))).rejects.toBeDefined();
  });
});

describe("searchLadder", () => {
  const sizes = [900, 800, 700, 600, 500, 400, 300, 200, 100];
  const run = async (target: number) => {
    let probes = 0;
    const result = await searchLadder(sizes.length, target, async (i) => {
      probes += 1;
      return sizes[i]!;
    });
    return { ...result, probes };
  };
  it("finds the best step that fits", async () => {
    expect(await run(550)).toMatchObject({ index: 4, reached: true });
    expect(await run(500)).toMatchObject({ index: 4, reached: true });
    expect(await run(1000)).toMatchObject({ index: 0, reached: true });
    expect(await run(100)).toMatchObject({ index: 8, reached: true });
  });
  it("returns the smallest step when nothing fits", async () => {
    expect(await run(50)).toMatchObject({ index: 8, reached: false });
  });
  it("asks only a few times", async () => {
    expect((await run(550)).probes).toBeLessThanOrEqual(4);
  });
});

describe("compressPdf by level", () => {
  it("keeps the text with the light level", async () => {
    const original = await realPdf(30);
    const out = await compressPdf({ bytes: original, pageCount: 30, render: renderer }, { kind: "level", level: "keep-text" });
    expect(out.ok && out.method).toBe("tidy");
    if (out.ok) expect(out.afterBytes).toBeLessThan(out.beforeBytes);
  });
  it("leaves a PDF alone when it cannot get smaller", async () => {
    const compact = await tidyPdf(await realPdf(2));
    const out = await compressPdf({ bytes: compact, pageCount: 2, render: renderer }, { kind: "level", level: "keep-text" });
    expect(out).toMatchObject({ ok: true, method: "unchanged" });
    if (out.ok) expect(out.bytes).toBe(compact);
  });
  it("turns pages into pictures for the other levels", async () => {
    const out = await compressPdf({ bytes: dummy(1_000_000), pageCount: 3, render: renderer }, { kind: "level", level: "balanced" });
    expect(out).toMatchObject({ ok: true, method: "pictures", step: LADDER[3] });
    if (out.ok) {
      expect(out.afterBytes).toBeLessThan(out.beforeBytes);
      expect((await PDFDocument.load(out.bytes)).getPageCount()).toBe(3);
      expect(out.notes.join(" ")).toContain("cannot be selected");
    }
  });
  it("does not make a PDF bigger", async () => {
    const original = await realPdf(2);
    const out = await compressPdf({ bytes: original, pageCount: 2, render: renderer }, { kind: "level", level: "good" });
    expect(out).toMatchObject({ ok: true, method: "unchanged" });
  });
  it("refuses picture levels for very long PDFs but allows the light level", async () => {
    const out = await compressPdf({ bytes: dummy(1_000_000), pageCount: MAX_RASTER_PAGES + 1, render: renderer }, { kind: "level", level: "strong" });
    expect(out).toMatchObject({ ok: false });
    if (!out.ok) expect(out.error).toContain("Keep the text");
  });
});

describe("compressPdf to a size", () => {
  it("picks the best step that fits the target", async () => {
    const sizeAt = async (i: number) => (await buildImagePdf(Array.from({ length: 2 }, () => ({ ...imageFor(LADDER[i]!.dpi, LADDER[i]!.quality), dpi: LADDER[i]!.dpi })))).length;
    const target = (await sizeAt(5)) + 10; // step 5 fits, step 4 does not
    const out = await compressPdf({ bytes: dummy(1_000_000), pageCount: 2, render: renderer }, { kind: "target", targetBytes: target });
    expect(out).toMatchObject({ ok: true, method: "pictures", reachedTarget: true, step: LADDER[5] });
    if (out.ok) expect(out.afterBytes).toBeLessThanOrEqual(target);
    expect(await sizeAt(4)).toBeGreaterThan(target);
  });
  it("tries the light way first", async () => {
    const original = await realPdf(30);
    const tidy = await tidyPdf(original);
    const out = await compressPdf({ bytes: original, pageCount: 30, render: renderer }, { kind: "target", targetBytes: tidy.length + 1 });
    expect(out).toMatchObject({ ok: true, method: "tidy", reachedTarget: true });
  });
  it("leaves a small PDF alone", async () => {
    const out = await compressPdf({ bytes: dummy(500), pageCount: 1, render: renderer }, { kind: "target", targetBytes: 1000 });
    expect(out).toMatchObject({ ok: true, method: "unchanged", reachedTarget: true });
  });
  it("says so when the target cannot be reached, and gives the smallest it could make", async () => {
    const out = await compressPdf({ bytes: dummy(1_000_000), pageCount: 2, render: renderer }, { kind: "target", targetBytes: 100 });
    expect(out).toMatchObject({ ok: true, method: "pictures", reachedTarget: false, step: LADDER[LADDER.length - 1] });
    if (out.ok) expect(out.notes.join(" ")).toContain("very low resolution");
  });
  it("renders each page only a few times", async () => {
    let calls = 0;
    const counting: PageRenderer = async (page, dpi, quality) => {
      calls += 1;
      return renderer(page, dpi, quality);
    };
    await compressPdf({ bytes: dummy(1_000_000), pageCount: 5, render: counting }, { kind: "target", targetBytes: 3000 });
    expect(calls).toBeLessThanOrEqual(5 * 5);
  });
  it("reports progress", async () => {
    const seen: string[] = [];
    await compressPdf(
      { bytes: dummy(1_000_000), pageCount: 2, render: renderer, onProgress: (p) => seen.push(`${p.attempt}:${p.page}/${p.pages}`) },
      { kind: "level", level: "good" }
    );
    expect(seen).toEqual(["1:1/2", "1:2/2"]);
  });
  it("can be stopped", async () => {
    const controller = new AbortController();
    controller.abort();
    const out = await compressPdf({ bytes: dummy(1_000_000), pageCount: 2, render: renderer, signal: controller.signal }, { kind: "level", level: "good" });
    expect(out).toEqual({ ok: false, error: "Stopped.", cancelled: true });
  });
  it("passes on a page that could not be drawn", async () => {
    const broken: PageRenderer = async () => ({ ok: false, error: "Page 1 could not be drawn." });
    const out = await compressPdf({ bytes: dummy(1_000_000), pageCount: 2, render: broken }, { kind: "level", level: "good" });
    expect(out).toEqual({ ok: false, error: "Page 1 could not be drawn.", cancelled: false });
  });
  it("fails clearly for a damaged PDF on the light level", async () => {
    const out = await compressPdf({ bytes: dummy(1000), pageCount: 1, render: renderer }, { kind: "level", level: "keep-text" });
    expect(out).toMatchObject({ ok: false });
    if (!out.ok) expect(out.error).toContain("could not be read");
  });
});