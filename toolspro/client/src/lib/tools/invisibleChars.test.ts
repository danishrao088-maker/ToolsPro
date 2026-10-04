import { describe, expect, it } from "vitest";
import {
  INVISIBLE_CHARS,
  MAX_REPEAT,
  formatCodePoint,
  parseRepeatCount,
  repeatChar,
} from "./invisibleChars";

describe("invisible characters", () => {
  it("has unique ids and code points", () => {
    expect(new Set(INVISIBLE_CHARS.map((item) => item.id)).size).toBe(INVISIBLE_CHARS.length);
    expect(new Set(INVISIBLE_CHARS.map((item) => item.codePoint)).size).toBe(INVISIBLE_CHARS.length);
  });

    it("contains no ordinary letters or digits", () => {
    for (const item of INVISIBLE_CHARS) {
      expect(/[A-Za-z0-9]/.test(String.fromCodePoint(item.codePoint)), item.name).toBe(false);
    }
  });

  it("formats code points", () => {
    expect(formatCodePoint(0x200b)).toBe("U+200B");
    expect(formatCodePoint(0x2800)).toBe("U+2800");
    expect(formatCodePoint(0x00a0)).toBe("U+00A0");
  });

  it("repeats a character", () => {
    const result = repeatChar(0x2800, 3);
    expect(result).toEqual({ ok: true, text: "\u2800\u2800\u2800" });
  });

  it("rejects an invalid count", () => {
    for (const count of [0, -1, MAX_REPEAT + 1, 1.5, Number.NaN]) {
      expect(repeatChar(0x2800, count).ok, String(count)).toBe(false);
    }
  });

  it("rejects a character that is not in the list", () => {
    expect(repeatChar(0x41, 1).ok).toBe(false);
  });

  it("parses the count field", () => {
    expect(parseRepeatCount("5")).toBe(5);
    expect(parseRepeatCount(" 7 ")).toBe(7);
    for (const value of ["", "abc", "1.5", "-2"]) {
      expect(parseRepeatCount(value), value).toBeNaN();
    }
  });
});