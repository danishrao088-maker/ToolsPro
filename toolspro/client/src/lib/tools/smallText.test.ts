import { describe, expect, it } from "vitest";
import { MAX_SMALL_TEXT_LENGTH, convertSmallText } from "./smallText";

const ALPHABET = "abcdefghijklmnopqrstuvwxyz";

function convert(text: string, style: Parameters<typeof convertSmallText>[1]) {
  const result = convertSmallText(text, style);
  if (!result.ok) throw new Error(result.error);
  return result;
}

describe("convertSmallText", () => {
  it("makes superscript text, including capitals, digits and symbols", () => {
    expect(convert("Hello", "superscript").output).toBe("ʰᵉˡˡᵒ");
    expect(convert("x2+1", "superscript").output).toBe("ˣ²⁺¹");
  });

  it("makes subscript text", () => {
    expect(convert("H2O", "subscript").output).toBe("ₕ₂ₒ");
  });

  it("makes small caps text", () => {
    expect(convert("Hello", "smallcaps").output).toBe("ʜᴇʟʟᴏ");
  });

  it("counts letters that have no small version", () => {
    expect(convert(ALPHABET, "superscript").unchanged).toBe(1); // q
    expect(convert(ALPHABET, "subscript").unchanged).toBe(9);
    expect(convert(ALPHABET, "smallcaps").unchanged).toBe(1); // x
  });

  it("keeps spaces, line breaks and emoji without counting them", () => {
    const result = convert("a b\n😀", "superscript");
       expect(result.output).toBe("ᵃ ᵇ\n😀");
    expect(result.unchanged).toBe(0);
  });

  it("keeps and counts letters from other scripts", () => {
    const result = convert("ا", "superscript");
    expect(result.output).toBe("ا");
    expect(result.unchanged).toBe(1);
  });

  it("returns empty output for empty input", () => {
    expect(convert("", "subscript")).toEqual({ ok: true, output: "", unchanged: 0 });
  });

  it("rejects text that is too long", () => {
    expect(convertSmallText("a".repeat(MAX_SMALL_TEXT_LENGTH + 1), "superscript").ok).toBe(false);
  });
});