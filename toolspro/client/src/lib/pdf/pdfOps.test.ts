import { PDFDocument } from "pdf-lib";
import { describe, expect, it } from "vitest";
import { extractGroups, loadPdf, mergePdfs, readPageCount, rotatePdf } from "./pdfOps";

// Har page ki chaurai alag hoti hai (100, 101, 102...), is liye hum pehchan sakte hain ke kaun sa page kahan gaya
async function makePdf(name: string, pageCount: number, firstWidth = 100): Promise<File> {
  const doc = await PDFDocument.create();
  for (let i = 0; i < pageCount; i += 1) doc.addPage([firstWidth + i, 200]);
  return new File([new Uint8Array(await doc.save())], name, { type: "application/pdf" });
}

async function widths(bytes: Uint8Array): Promise<number[]> {
  const doc = await PDFDocument.load(bytes);
  return doc.getPages().map((page) => page.getWidth());
}

async function rotations(bytes: Uint8Array): Promise<number[]> {
  const doc = await PDFDocument.load(bytes);
  return doc.getPages().map((page) => page.getRotation().angle);
}

describe("readPageCount and loadPdf", () => {
  it("counts the pages", async () => {
    expect(await readPageCount(await makePdf("a.pdf", 4))).toEqual({ ok: true, pageCount: 4 });
  });

  it("rejects files that are not PDFs", async () => {
    const text = new File(["just some text"], "notes.pdf", { type: "application/pdf" });
    const result = await loadPdf(text);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("does not look like a PDF");
  });

  it("rejects a damaged PDF that has the right header", async () => {
    const broken = new File(["%PDF-1.7\nthis is not a real pdf body"], "broken.pdf", { type: "application/pdf" });
    const result = await loadPdf(broken);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("broken.pdf");
  });
});

describe("mergePdfs", () => {
  it("joins the files in the given order", async () => {
    const a = await makePdf("a.pdf", 2, 100); // 100, 101
    const b = await makePdf("b.pdf", 3, 200); // 200, 201, 202
    const merged = await mergePdfs([b, a]);
    expect(merged.ok).toBe(true);
    if (merged.ok) {
      expect(merged.pages).toBe(5);
      expect(await widths(merged.bytes)).toEqual([200, 201, 202, 100, 101]);
    }
  });

  it("can use the same file twice", async () => {
    const a = await makePdf("a.pdf", 2);
    const merged = await mergePdfs([a, a]);
    expect(merged.ok && merged.pages).toBe(4);
  });

  it("reports which file is bad", async () => {
    const good = await makePdf("good.pdf", 1);
    const bad = new File(["nothing"], "bad.pdf", { type: "application/pdf" });
    const merged = await mergePdfs([good, bad]);
    expect(merged.ok).toBe(false);
    if (!merged.ok) expect(merged.error).toContain("bad.pdf");
  });
});

describe("extractGroups", () => {
  it("makes one PDF per group, with the pages in the order of the group", async () => {
    const file = await makePdf("a.pdf", 5); // 100..104
    const result = await extractGroups(file, [[3, 0], [1, 2], [4]]);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.parts.map((part) => part.pages)).toEqual([2, 2, 1]);
      expect(await widths(result.parts[0]?.bytes ?? new Uint8Array())).toEqual([103, 100]);
      expect(await widths(result.parts[1]?.bytes ?? new Uint8Array())).toEqual([101, 102]);
      expect(await widths(result.parts[2]?.bytes ?? new Uint8Array())).toEqual([104]);
    }
  });

  it("keeps a repeated page repeated", async () => {
    const result = await extractGroups(await makePdf("a.pdf", 3), [[1, 1]]);
    expect(result.ok).toBe(true);
    if (result.ok) expect(await widths(result.parts[0]?.bytes ?? new Uint8Array())).toEqual([101, 101]);
  });
});

describe("rotatePdf", () => {
  it("rotates only the chosen pages", async () => {
    const result = await rotatePdf(await makePdf("a.pdf", 4), [0, 2], 90);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.pages).toBe(4);
      expect(await rotations(result.bytes)).toEqual([90, 0, 90, 0]);
    }
  });

  it("adds to the rotation a page already has", async () => {
    const first = await rotatePdf(await makePdf("a.pdf", 2), [0, 1], 270);
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    const again = await rotatePdf(new File([first.bytes], "a.pdf", { type: "application/pdf" }), [0], 180);
    expect(again.ok).toBe(true);
    if (again.ok) expect(await rotations(again.bytes)).toEqual([90, 270]);
  });

  it("does not change the page sizes", async () => {
    const result = await rotatePdf(await makePdf("a.pdf", 3), [0, 1, 2], 180);
    expect(result.ok).toBe(true);
    if (result.ok) expect(await widths(result.bytes)).toEqual([100, 101, 102]);
  });
});