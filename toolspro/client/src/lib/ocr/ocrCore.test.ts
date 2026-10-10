import { describe, expect, it } from "vitest";
import { OCR_LANGUAGES, cleanOcrText, confidenceLabel, findLanguage, textFileName, textStats } from "./ocrCore";

describe("cleanOcrText", () => {
  it("fixes line endings, trailing spaces and extra blank lines", () => {
    expect(cleanOcrText("Hello  \r\nworld\t\r\n\r\n\r\n\r\nEnd \n")).toBe("Hello\nworld\n\nEnd");
  });

  it("returns an empty string for blank text", () => {
    expect(cleanOcrText(" \n\n \t ")).toBe("");
  });

  it("keeps Urdu text unchanged", () => {
    expect(cleanOcrText("یہ ایک ٹیسٹ ہے")).toBe("یہ ایک ٹیسٹ ہے");
  });
});

describe("textStats", () => {
  it("counts words, characters and non-empty lines", () => {
    expect(textStats("one two\n\nthree")).toEqual({ words: 3, characters: 14, lines: 2 });
    expect(textStats("   ")).toEqual({ words: 0, characters: 0, lines: 0 });
  });
});

describe("confidenceLabel", () => {
  it("gives softer words for lower confidence", () => {
    expect(confidenceLabel(95)).toContain("clear");
    expect(confidenceLabel(70)).toContain("may be wrong");
    expect(confidenceLabel(30)).toContain("hard to read");
    expect(confidenceLabel(0)).toBe("");
    expect(confidenceLabel(Number.NaN)).toBe("");
  });
});

describe("languages and file names", () => {
  it("finds a language and falls back to the first one", () => {
    expect(findLanguage("urd").rtl).toBe(true);
    expect(findLanguage("xx")).toBe(OCR_LANGUAGES[0]);
  });

  it("makes a safe .txt name", () => {
    expect(textFileName("scan.final.png")).toBe("scan.final.txt");
    expect(textFileName("a/b:c.jpg")).toBe("a_b_c.txt");
    expect(textFileName(".png")).toBe("png.txt");
    expect(textFileName("")).toBe("text.txt");
  });
});