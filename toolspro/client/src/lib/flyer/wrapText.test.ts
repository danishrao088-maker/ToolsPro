import { describe, expect, it } from "vitest";
import { wrapText } from "./wrapText";

const measure = (text: string) => Array.from(text).length * 10; // har huroof 10 chaura

describe("wrapText", () => {
  it("breaks at spaces so every line fits", () => {
    expect(wrapText("one two three four", 100, measure)).toEqual(["one two", "three four"]);
  });

  it("keeps a short text on one line", () => {
    expect(wrapText("hello world", 500, measure)).toEqual(["hello world"]);
  });

  it("keeps line breaks and blank lines", () => {
    expect(wrapText("a\n\nb\r\nc", 500, measure)).toEqual(["a", "", "b", "c"]);
  });

  it("breaks a word that is wider than the line", () => {
    expect(wrapText("abcdefghij", 40, measure)).toEqual(["abcd", "efgh", "ij"]);
  });

  it("puts a long word on its own line after the earlier words", () => {
    expect(wrapText("hi abcdefgh", 50, measure)).toEqual(["hi", "abcde", "fgh"]);
  });

  it("handles empty text and extra spaces", () => {
    expect(wrapText("", 100, measure)).toEqual([""]);
    expect(wrapText("  a   b  ", 100, measure)).toEqual(["a b"]);
  });

  it("does not split an Urdu or emoji character in half", () => {
    const lines = wrapText("علی😀😀😀😀", 30, measure);
    expect(lines.join("")).toBe("علی😀😀😀😀");
    expect(lines.every((line) => Array.from(line).length <= 3)).toBe(true);
  });
});