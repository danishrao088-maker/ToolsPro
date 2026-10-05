import { describe, expect, it } from "vitest";
import { MAX_EDITOR_CHARS, MAX_FILE_BYTES, checkOpenedFile, countText } from "./textStats";

describe("countText", () => {
  it("returns zeros for empty text", () => {
    expect(countText("")).toEqual({ characters: 0, charactersNoSpaces: 0, words: 0, lines: 0, paragraphs: 0 });
  });

  it("counts a simple text", () => {
    expect(countText("Hello world\nSecond line")).toEqual({
      characters: 23,
      charactersNoSpaces: 20,
      words: 4,
      lines: 2,
      paragraphs: 1,
    });
  });

  it("handles whitespace-only text", () => {
    expect(countText("  \n ")).toEqual({ characters: 4, charactersNoSpaces: 0, words: 0, lines: 2, paragraphs: 0 });
  });

  it("counts an emoji as one character", () => {
    expect(countText("a😀").characters).toBe(2);
  });

  it("counts words in other scripts", () => {
    expect(countText("میں اردو").words).toBe(2);
  });

  it("counts paragraphs separated by blank lines", () => {
    expect(countText("a\n\nb\n \nc").paragraphs).toBe(3);
    expect(countText("a\nb").paragraphs).toBe(1);
    expect(countText("a\n\n\n\nb").paragraphs).toBe(2);
  });

  it("handles Windows line endings", () => {
    const stats = countText("a\r\n\r\nb");
    expect(stats.lines).toBe(3);
    expect(stats.paragraphs).toBe(2);
  });
});

describe("checkOpenedFile", () => {
  it("accepts a normal text file", () => {
    expect(checkOpenedFile(100, "hello")).toEqual({ ok: true });
  });

  it("rejects a file that is too large", () => {
    expect(checkOpenedFile(MAX_FILE_BYTES + 1, "").ok).toBe(false);
  });

  it("rejects a file that is not text", () => {
    const result = checkOpenedFile(10, "ab\u0000cd");
    expect(result).toEqual({ ok: false, error: "That file does not look like plain text." });
  });

  it("rejects too many characters", () => {
    expect(checkOpenedFile(10, "a".repeat(MAX_EDITOR_CHARS + 1)).ok).toBe(false);
  });
});