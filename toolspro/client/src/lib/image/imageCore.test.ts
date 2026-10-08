import { describe, expect, it } from "vitest";
import {
  MAX_FILE_BYTES,
  describeChange,
  detectImageType,
  fitWithin,
  formatBytes,
  getOutputFormat,
  outputFileName,
  qualityValue,
  resolveCompressFormat,
  validateImageFile,
} from "./imageCore";

const file = (name: string, type: string, size = 1000) => ({ name, type, size });

describe("detectImageType and validateImageFile", () => {
  it("trusts the browser type first, then the extension", () => {
    expect(detectImageType(file("a.jpg", "image/png"))).toBe("image/png");
    expect(detectImageType(file("PHOTO.JPG", ""))).toBe("image/jpeg");
    expect(detectImageType(file("noextension", ""))).toBe("");
  });

  it("accepts supported images", () => {
    for (const [name, type] of [
      ["a.jpg", "image/jpeg"],
      ["a.png", "image/png"],
      ["a.webp", "image/webp"],
      ["a.gif", "image/gif"],
      ["a.bmp", "image/bmp"],
      ["a.avif", "image/avif"],
      ["a.JPEG", ""],
    ] as const) {
      expect(validateImageFile(file(name, type)).ok, name).toBe(true);
    }
  });

  it("rejects SVG and other file types", () => {
    const svg = validateImageFile(file("logo.svg", "image/svg+xml"));
    expect(svg.ok).toBe(false);
    for (const [name, type] of [["a.pdf", "application/pdf"], ["a.txt", "text/plain"], ["a", ""]] as const) {
      expect(validateImageFile(file(name, type)).ok, name).toBe(false);
    }
  });

  it("rejects empty and oversized files", () => {
    expect(validateImageFile(file("a.png", "image/png", 0))).toEqual({ ok: false, error: '"a.png" is empty.' });
    const big = validateImageFile(file("a.png", "image/png", MAX_FILE_BYTES + 1));
    expect(big.ok).toBe(false);
    expect(validateImageFile(file("a.png", "image/png", MAX_FILE_BYTES)).ok).toBe(true);
  });
});

describe("outputFileName", () => {
  it("replaces the extension", () => {
    expect(outputFileName("photo.png", "jpg", new Set())).toBe("photo.jpg");
    expect(outputFileName("my.holiday.photo.PNG", "webp", new Set())).toBe("my.holiday.photo.webp");
    expect(outputFileName("photo", "png", new Set())).toBe("photo.png");
  });

  it("removes unsafe characters but keeps other languages", () => {
    expect(outputFileName('a/b:c*d?"e<f>g|h.png', "jpg", new Set())).toBe("a_b_c_d__e_f_g_h.jpg");
    expect(outputFileName("تصویر 1.png", "jpg", new Set())).toBe("تصویر 1.jpg");
  });

  it("handles names that are only dots", () => {
    expect(outputFileName(".png", "jpg", new Set())).toBe("png.jpg");
    expect(outputFileName("...", "jpg", new Set())).toBe("image.jpg");
  });

  it("makes names unique, ignoring case", () => {
    const used = new Set<string>();
    expect(outputFileName("a.png", "jpg", used)).toBe("a.jpg");
    expect(outputFileName("a.gif", "jpg", used)).toBe("a-2.jpg");
    expect(outputFileName("A.bmp", "jpg", used)).toBe("A-3.jpg");
  });

  it("shortens very long names", () => {
    expect(outputFileName(`${"a".repeat(300)}.png`, "jpg", new Set())).toHaveLength(104);
  });
});

describe("formatBytes", () => {
  it("formats sizes", () => {
    expect(formatBytes(0)).toBe("0 B");
    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(1024)).toBe("1.0 KB");
    expect(formatBytes(1536)).toBe("1.5 KB");
    expect(formatBytes(10 * 1024)).toBe("10 KB");
    expect(formatBytes(1024 * 1024)).toBe("1.0 MB");
    expect(formatBytes(20 * 1024 * 1024)).toBe("20 MB");
  });
});

describe("fitWithin", () => {
  it("leaves images alone when no limit applies", () => {
    expect(fitWithin(4000, 2000, null)).toEqual({ width: 4000, height: 2000 });
    expect(fitWithin(800, 600, 1000)).toEqual({ width: 800, height: 600 });
    expect(fitWithin(1000, 500, 1000)).toEqual({ width: 1000, height: 500 });
  });

  it("scales the longest side down and keeps the shape", () => {
    expect(fitWithin(4000, 2000, 1000)).toEqual({ width: 1000, height: 500 });
    expect(fitWithin(2000, 4000, 1000)).toEqual({ width: 500, height: 1000 });
  });

  it("never returns a side smaller than 1 pixel", () => {
    expect(fitWithin(10000, 1, 100)).toEqual({ width: 100, height: 1 });
  });
});

describe("describeChange", () => {
  it("describes smaller, larger and equal sizes", () => {
    expect(describeChange(1000, 500)).toBe("50% smaller");
    expect(describeChange(1000, 1200)).toBe("20% larger");
    expect(describeChange(1000, 1003)).toBe("about the same size");
    expect(describeChange(0, 10)).toBe("");
  });
});

describe("compress helpers", () => {
  it("keeps JPG, PNG and WebP, and converts other types to JPG with a note", () => {
    expect(resolveCompressFormat("image/png", "keep")).toEqual({ mime: "image/png", note: "" });
    expect(resolveCompressFormat("image/webp", "keep").mime).toBe("image/webp");
    const gif = resolveCompressFormat("image/gif", "keep");
    expect(gif.mime).toBe("image/jpeg");
    expect(gif.note).toContain("JPG");
  });

  it("uses the chosen format when it is not 'keep'", () => {
    expect(resolveCompressFormat("image/png", "image/webp")).toEqual({ mime: "image/webp", note: "" });
  });

  it("converts the quality slider to a safe canvas value", () => {
    expect(qualityValue(80)).toBe(0.8);
    expect(qualityValue(100)).toBe(1);
    expect(qualityValue(0)).toBe(0.01);
    expect(qualityValue(250)).toBe(1);
    expect(qualityValue(Number.NaN)).toBe(0.8);
  });

  it("looks up output formats", () => {
    expect(getOutputFormat("image/jpeg")?.extension).toBe("jpg");
    expect(getOutputFormat("image/gif")).toBeUndefined();
  });
});