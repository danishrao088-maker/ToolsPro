import { describe, expect, it } from "vitest";
import { MAX_INPUT_LENGTH, convertToLowercase } from "./caseConverter";

function ok(input: string) {
  const result = convertToLowercase(input);
  if (!result.ok) throw new Error(`Expected success but got: ${result.error}`);
  return result;
}

describe("convertToLowercase", () => {
  it("converts uppercase text to lowercase", () => {
    expect(ok("HELLO WORLD").output).toBe("hello world");
  });

  it("converts mixed case", () => {
    expect(ok("HeLLo WoRLD").output).toBe("hello world");
  });

  it("keeps numbers, symbols and line breaks unchanged", () => {
    expect(ok("ABC 123!\nDEF #4").output).toBe("abc 123!\ndef #4");
  });

  it("keeps leading and trailing spaces", () => {
    expect(ok("  HI  ").output).toBe("  hi  ");
  });

  it("handles accented and non-Latin letters", () => {
    expect(ok("ÉCOLE ÜBER").output).toBe("école über");
    expect(ok("ПРИВЕТ").output).toBe("привет");
  });

  it("reports character and word counts", () => {
    const result = ok("ONE TWO\nTHREE");
    expect(result.characters).toBe(13);
    expect(result.words).toBe(3);
  });

  it("rejects empty input", () => {
    const result = convertToLowercase("");
    expect(result.ok).toBe(false);
  });

  it("rejects whitespace-only input", () => {
    const result = convertToLowercase("  \n\t ");
    expect(result.ok).toBe(false);
  });

  it("accepts input at the size limit", () => {
    expect(convertToLowercase("A".repeat(MAX_INPUT_LENGTH)).ok).toBe(true);
  });

  it("rejects input over the size limit", () => {
    const result = convertToLowercase("A".repeat(MAX_INPUT_LENGTH + 1));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("too long");
  });
});