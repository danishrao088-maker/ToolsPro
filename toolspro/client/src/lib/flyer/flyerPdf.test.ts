import { PDFDocument } from "pdf-lib";
import { describe, expect, it } from "vitest";
import { pngToPdf } from "./flyerPdf";

const PNG = Uint8Array.from(atob("iVBORw0KGgoAAAANSUhEUgAAABQAAAAcCAIAAADuuAg3AAAAIUlEQVR42mOUSznBQC5gYqAAjGoe1TyqeVTzqOZRzcQBAFh9AYKGs/tTAAAAAElFTkSuQmCC"), (c) => c.charCodeAt(0));

describe("pngToPdf", () => {
  it("makes a one-page A4 PDF", async () => {
    const bytes = await pngToPdf(PNG, "a4");
    expect(new TextDecoder().decode(bytes.slice(0, 5))).toBe("%PDF-");
    const doc = await PDFDocument.load(bytes);
    expect(doc.getPageCount()).toBe(1);
    const page = doc.getPage(0);
    expect(page.getWidth()).toBeCloseTo(595.28, 1);
    expect(page.getHeight()).toBeCloseTo(841.89, 1);
  });

  it("uses the US Letter size", async () => {
    const doc = await PDFDocument.load(await pngToPdf(PNG, "letter"));
    expect([doc.getPage(0).getWidth(), doc.getPage(0).getHeight()]).toEqual([612, 792]);
  });

  it("rejects data that is not a PNG", async () => {
    await expect(pngToPdf(new Uint8Array([1, 2, 3]), "a4")).rejects.toThrow();
  });
});