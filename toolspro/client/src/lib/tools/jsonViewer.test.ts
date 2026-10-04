import { describe, expect, it } from "vitest";
import { MAX_JSON_LENGTH, formatJson, minifyJson } from "./jsonViewer";
import { error, output } from "./testHelpers";

describe("formatJson", () => {
  it("formats with 2 spaces by default", () => {
    expect(output(formatJson('{"a":1,"b":[1,2]}'))).toBe('{\n  "a": 1,\n  "b": [\n    1,\n    2\n  ]\n}');
  });

  it("formats with 4 spaces when asked", () => {
    expect(output(formatJson('{"a":1}', 4))).toBe('{\n    "a": 1\n}');
  });

  it("accepts top-level arrays and values", () => {
    expect(output(formatJson("[1,2]"))).toBe("[\n  1,\n  2\n]");
    expect(output(formatJson("true"))).toBe("true");
  });

  it("keeps unicode text as it is", () => {
    expect(output(formatJson('{"name":"café"}'))).toContain("café");
  });

  it("reports invalid JSON", () => {
    expect(error(formatJson('{"a":1,}'))).toMatch(/^Invalid JSON/);
    expect(error(formatJson("{'a':1}"))).toMatch(/^Invalid JSON/);
  });

  it("rejects empty input", () => {
    expect(formatJson("  ").ok).toBe(false);
  });

  it("rejects input over the size limit", () => {
    expect(error(formatJson("1".repeat(MAX_JSON_LENGTH + 1)))).toContain("too large");
  });
});

describe("minifyJson", () => {
  it("removes whitespace", () => {
    expect(output(minifyJson('{\n  "a": 1,\n  "b": [1, 2]\n}'))).toBe('{"a":1,"b":[1,2]}');
  });

  it("reports invalid JSON", () => {
    expect(error(minifyJson("{oops}"))).toMatch(/^Invalid JSON/);
  });
});