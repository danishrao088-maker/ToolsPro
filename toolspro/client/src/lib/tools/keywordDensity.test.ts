import { describe, expect, it } from "vitest";
import {
  MAX_KEYWORD_TEXT_LENGTH,
  analyzeKeywords,
  type KeywordAnalysis,
  type KeywordOptions,
} from "./keywordDensity";

const single: KeywordOptions = { phraseLength: 1, ignoreCommonWords: false, limit: 20 };

function ok(result: KeywordAnalysis) {
  if (!result.ok) throw new Error(`Expected success but got: ${result.error}`);
  return result;
}

describe("analyzeKeywords", () => {
  it("counts words and calculates density", () => {
    const result = ok(analyzeKeywords("apple banana apple", single));
    expect(result.totalWords).toBe(3);
    expect(result.rows[0]).toMatchObject({ phrase: "apple", count: 2 });
    expect(result.rows[0]?.density).toBeCloseTo(66.667, 2);
    expect(result.rows[1]).toMatchObject({ phrase: "banana", count: 1 });
  });

  it("ignores case and punctuation", () => {
    const result = ok(analyzeKeywords("Hello, hello! HELLO?", single));
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]).toMatchObject({ phrase: "hello", count: 3 });
  });

  it("counts numbers as words", () => {
    expect(ok(analyzeKeywords("2026 tools 2026", single)).rows[0]).toMatchObject({ phrase: "2026", count: 2 });
  });

  it("keeps common words by default and hides them when asked", () => {
    const text = "the cat and the dog";
    expect(ok(analyzeKeywords(text, single)).rows[0]).toMatchObject({ phrase: "the", count: 2 });

    const filtered = ok(analyzeKeywords(text, { ...single, ignoreCommonWords: true }));
    expect(filtered.totalWords).toBe(5);
    expect(filtered.rows.map((row) => row.phrase)).toEqual(["cat", "dog"]);
    expect(filtered.rows[0]?.density).toBeCloseTo(20, 5);
  });

  it("counts two-word phrases", () => {
    const result = ok(analyzeKeywords("red car red car blue car", { ...single, phraseLength: 2 }));
    expect(result.rows[0]).toMatchObject({ phrase: "red car", count: 2 });
    expect(result.rows[0]?.density).toBeCloseTo(40, 5);
    expect(result.rows.map((row) => row.phrase)).toEqual(["red car", "blue car", "car blue", "car red"]);
  });

  it("skips phrases that start or end with a common word", () => {
    const result = ok(analyzeKeywords("cat and dog", { phraseLength: 2, ignoreCommonWords: true, limit: 20 }));
    expect(result.rows).toEqual([]);
  });

  it("handles apostrophes and other languages", () => {
    expect(ok(analyzeKeywords("Don’t stop don't", single)).rows[0]).toMatchObject({ phrase: "don't", count: 2 });
    expect(ok(analyzeKeywords("میں اردو میں", single)).rows[0]).toMatchObject({ phrase: "میں", count: 2 });
  });

  it("respects the row limit", () => {
    const text = Array.from({ length: 30 }, (_, i) => `word${i}`).join(" ");
    const result = ok(analyzeKeywords(text, { ...single, limit: 5 }));
    expect(result.rows).toHaveLength(5);
    expect(result.distinctPhrases).toBe(30);
  });

  it("returns no rows for empty text or text shorter than the phrase", () => {
    expect(ok(analyzeKeywords("", single))).toMatchObject({ totalWords: 0, rows: [] });
    expect(ok(analyzeKeywords("one two", { ...single, phraseLength: 3 })).rows).toEqual([]);
  });

  it("rejects text that is too long", () => {
    const result = analyzeKeywords("a".repeat(MAX_KEYWORD_TEXT_LENGTH + 1), single);
    expect(result.ok).toBe(false);
  });
});