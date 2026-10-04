import { describe, expect, it } from "vitest";
import { MAX_BINARY_LENGTH, MAX_TEXT_LENGTH, binaryToText, textToBinary } from "./binaryConverter";
import { error, output } from "./testHelpers";

describe("textToBinary", () => {
  it("converts a letter to one byte", () => {
    expect(output(textToBinary("A"))).toBe("01000001");
  });

  it("separates bytes with spaces", () => {
    expect(output(textToBinary("Hi"))).toBe("01001000 01101001");
  });

  it("encodes non-ASCII characters as UTF-8", () => {
    expect(output(textToBinary("é"))).toBe("11000011 10101001");
  });

  it("encodes emoji as four bytes", () => {
    expect(output(textToBinary("😀"))).toBe("11110000 10011111 10011000 10000000");
  });

  it("rejects empty input", () => {
    expect(textToBinary("").ok).toBe(false);
  });

  it("rejects input over the size limit", () => {
    expect(error(textToBinary("A".repeat(MAX_TEXT_LENGTH + 1)))).toContain("too long");
  });
});

describe("binaryToText", () => {
  it("decodes spaced bytes", () => {
    expect(output(binaryToText("01001000 01101001"))).toBe("Hi");
  });

  it("decodes bytes without spaces", () => {
    expect(output(binaryToText("0100100001101001"))).toBe("Hi");
  });

  it("accepts line breaks and extra spaces", () => {
    expect(output(binaryToText("  01001000\n01101001  "))).toBe("Hi");
  });

  it("accepts groups split into four bits", () => {
    expect(output(binaryToText("0100 1000 0110 1001"))).toBe("Hi");
  });

  it("rejects characters other than 0 and 1", () => {
    expect(error(binaryToText("0100 0102"))).toContain("only 0 and 1");
  });

  it("rejects a bit count that is not a multiple of 8", () => {
    expect(error(binaryToText("0100000"))).toContain("7 bits");
  });

  it("rejects bytes that are not valid UTF-8", () => {
    expect(error(binaryToText("11111111"))).toContain("not valid UTF-8");
  });

  it("rejects empty input", () => {
    expect(binaryToText("   ").ok).toBe(false);
  });

  it("rejects input over the size limit", () => {
    expect(error(binaryToText("0".repeat(MAX_BINARY_LENGTH + 1)))).toContain("too long");
  });

  it("round-trips text in many scripts", () => {
    for (const text of ["Hello, World!", "café", "日本語", "😀 ok", "اردو"]) {
      expect(output(binaryToText(output(textToBinary(text))))).toBe(text);
    }
  });
});