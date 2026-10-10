import { describe, expect, it } from "vitest";
import { buildDocx, documentXml, escapeXml, layoutPage, type DocxImage, type DocxOptions } from "./docx";

const base: DocxOptions = { pageSize: "a4", margin: "normal", sizeMode: "fit" };
const EMU = 9525;

function image(name: string, width: number, height: number, extension: "jpg" | "png" = "png"): DocxImage {
  return { name, extension, data: new Uint8Array([1, 2, 3, 4]), width, height };
}

describe("escapeXml", () => {
  it("escapes special characters and drops control characters", () => {
    expect(escapeXml(`a&b<c>"d"'e'`)).toBe("a&amp;b&lt;c&gt;&quot;d&quot;&apos;e&apos;");
    expect(escapeXml("a\u0000b\u0008c")).toBe("abc");
    expect(escapeXml("تصویر")).toBe("تصویر");
  });
});

describe("layoutPage", () => {
  it("fits a portrait picture on A4 with the aspect ratio kept", () => {
    const layout = layoutPage({ width: 1000, height: 2000 }, base);
    expect([layout.pageWidth, layout.pageHeight]).toEqual([11906, 16838]);
    expect(layout.imageWidth / layout.imageHeight).toBeCloseTo(0.5, 2);
    expect(layout.imageWidth).toBeLessThanOrEqual((11906 - 2880) * 635);
    expect(layout.imageHeight).toBeLessThan((16838 - 2880) * 635);
  });

  it("turns the page sideways for a wide picture", () => {
    const layout = layoutPage({ width: 3000, height: 1000 }, base);
    expect([layout.pageWidth, layout.pageHeight]).toEqual([16838, 11906]);
    expect(layout.imageWidth / layout.imageHeight).toBeCloseTo(3, 2);
  });

  it("uses the Letter size", () => {
    const layout = layoutPage({ width: 100, height: 200 }, { ...base, pageSize: "letter" });
    expect([layout.pageWidth, layout.pageHeight]).toEqual([12240, 15840]);
  });

  it("keeps a small picture small, and shrinks a big one, in original mode", () => {
    const original = { ...base, sizeMode: "original" as const };
    const small = layoutPage({ width: 100, height: 50 }, original);
    expect(small.imageWidth).toBe(100 * EMU);
    expect(small.imageHeight).toBe(50 * EMU);
    const big = layoutPage({ width: 5000, height: 5000 }, original);
    expect(big.imageWidth).toBeLessThan(5000 * EMU);
    expect(big.imageWidth).toBe(big.imageHeight);
  });

  it("matches the page to the picture and stays inside Word's limit", () => {
    const match = { ...base, pageSize: "match" as const, margin: "none" as const };
    const normal = layoutPage({ width: 960, height: 480 }, match);
    expect([normal.pageWidth, normal.pageHeight]).toEqual([14400, 7200]); // 10 x 5 inch
    const huge = layoutPage({ width: 100000, height: 50000 }, match);
    expect(Math.max(huge.pageWidth, huge.pageHeight)).toBeLessThanOrEqual(31680);
    const tiny = layoutPage({ width: 1, height: 1 }, match);
    expect(tiny.pageWidth).toBeGreaterThanOrEqual(720);
  });
});

describe("documentXml", () => {
  it("has one paragraph per picture and a section break after all but the last", () => {
    const xml = documentXml([image("a.png", 10, 10), image("b.png", 10, 10), image("c.png", 10, 10)], base);
    expect(xml.match(/<w:p>/g)).toHaveLength(3);
    expect(xml.match(/<w:sectPr>/g)).toHaveLength(3); // 2 paragraph mein + 1 body mein
    expect(xml.match(/r:embed="rId\d"/g)).toEqual(['r:embed="rId1"', 'r:embed="rId2"', 'r:embed="rId3"']);
  });

  it("escapes file names used as alt text", () => {
    const xml = documentXml([image(`a"<b>&.png`, 10, 10)], base);
    expect(xml).toContain('descr="a&quot;&lt;b&gt;&amp;.png"');
  });

  it("marks landscape sections", () => {
    expect(documentXml([image("w.png", 300, 100)], base)).toContain('w:orient="landscape"');
    expect(documentXml([image("t.png", 100, 300)], base)).not.toContain("landscape");
  });
});

function listNames(zip: Uint8Array): string[] {
  const view = new DataView(zip.buffer, zip.byteOffset, zip.byteLength);
  const end = zip.length - 22;
  const count = view.getUint16(end + 10, true);
  let pos = view.getUint32(end + 16, true);
  const names: string[] = [];
  for (let i = 0; i < count; i += 1) {
    const length = view.getUint16(pos + 28, true);
    names.push(new TextDecoder().decode(zip.subarray(pos + 46, pos + 46 + length)));
    pos += 46 + length;
  }
  return names;
}

describe("buildDocx", () => {
  it("packs the XML parts and every picture", async () => {
    const bytes = await buildDocx([image("a.jpg", 10, 10, "jpg"), image("b.png", 20, 10)], base);
    expect(listNames(bytes)).toEqual([
      "[Content_Types].xml",
      "_rels/.rels",
      "word/document.xml",
      "word/_rels/document.xml.rels",
      "word/media/image1.jpg",
      "word/media/image2.png",
    ]);
  });

  it("needs at least one picture", async () => {
    await expect(buildDocx([], base)).rejects.toThrow(RangeError);
  });
});