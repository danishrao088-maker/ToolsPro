import { describe, expect, it } from "vitest";
import { CODE_LENGTH, MAX_DESTINATION, generateCode, isValidCode, parseDestination } from "../src/services/shortUrl";

function codeOf(run: () => unknown): string {
  try {
    run();
    return "no error";
  } catch (error) {
    return (error as { code?: string }).code ?? "other";
  }
}

describe("generateCode", () => {
  it("makes codes of the right length from the safe alphabet", () => {
    for (let i = 0; i < 200; i += 1) {
      const code = generateCode();
      expect(code).toHaveLength(CODE_LENGTH);
      expect(code).toMatch(/^[2-9a-km-zA-HJ-NP-Z]+$/); // koi 0, 1, l, I, O nahi
    }
  });
  it("uses the random source it is given", () => {
    expect(generateCode(() => 0)).toBe("2".repeat(CODE_LENGTH));
  });
  it("gives different codes", () => {
    const codes = new Set(Array.from({ length: 500 }, () => generateCode()));
    expect(codes.size).toBe(500);
  });
});

describe("isValidCode", () => {
  it("accepts letters and digits of a sensible length", () => {
    for (const code of ["abcd", "aB3xK9p", "A".repeat(32)]) expect(isValidCode(code)).toBe(true);
  });
  it("rejects everything else", () => {
    for (const code of ["", "abc", "a".repeat(33), "ab/cd", "ab cd", "ab.cd", "..", "ab%20cd", undefined, null, 5, ["abcd"]]) {
      expect(isValidCode(code)).toBe(false);
    }
  });
});

describe("parseDestination: accepted addresses", () => {
  it("accepts normal addresses and cleans them", () => {
    expect(parseDestination("https://example.com/a-long-page?x=1#top")).toBe("https://example.com/a-long-page?x=1#top");
    expect(parseDestination("  Example.COM/Path ")).toBe("https://example.com/Path");
    expect(parseDestination("http://www.example.com")).toBe("http://www.example.com/");
    expect(parseDestination("example.com:443/x")).toBe("https://example.com/x");
    expect(parseDestination("https://example.com:443/x")).toBe("https://example.com/x");
    expect(parseDestination("http://example.com:80/")).toBe("http://example.com/");
  });
  it("accepts international and punycode names", () => {
    expect(parseDestination("https://münchen.example/straße")).toBe("https://xn--mnchen-3ya.example/stra%C3%9Fe");
  });
});

describe("parseDestination: refused addresses", () => {
  it("refuses empty, long and spaced input", () => {
    expect(codeOf(() => parseDestination(""))).toBe("VALIDATION_ERROR");
    expect(codeOf(() => parseDestination("   "))).toBe("VALIDATION_ERROR");
    expect(codeOf(() => parseDestination(`https://example.com/${"a".repeat(MAX_DESTINATION)}`))).toBe("INVALID_URL");
    expect(codeOf(() => parseDestination("https://exa mple.com"))).toBe("INVALID_URL");
    expect(codeOf(() => parseDestination("https://example.com/a\nb"))).toBe("INVALID_URL");
  });
  it("refuses other schemes", () => {
    for (const text of ["javascript:alert(1)", "data:text/html,<b>x</b>", "mailto:a@example.com", "ftp://example.com/file", "file:///etc/passwd", "JAVASCRIPT:alert(1)", "vbscript:x", "blob:https://example.com/x"]) {
      expect(codeOf(() => parseDestination(text))).toBe("INVALID_URL");
    }
  });
  it("refuses a username or password", () => {
    expect(codeOf(() => parseDestination("https://user:pass@example.com"))).toBe("INVALID_URL");
    expect(codeOf(() => parseDestination("https://user@example.com"))).toBe("INVALID_URL");
  });
  it("refuses IP addresses in every spelling, and local names", () => {
    for (const text of ["http://127.0.0.1", "http://8.8.8.8/", "http://[::1]/", "http://[2001:db8::1]/", "http://2130706433/", "http://0x7f.1/", "http://0177.0.0.1/", "localhost", "http://localhost:3000", "foo.localhost", "printer.local", "db.internal", "router.lan", "intranet"]) {
      expect(codeOf(() => parseDestination(text))).toBe("INVALID_URL");
    }
  });
  it("refuses custom ports", () => {
    expect(codeOf(() => parseDestination("https://example.com:8080/"))).toBe("INVALID_URL");
    expect(codeOf(() => parseDestination("http://example.com:22"))).toBe("INVALID_URL");
  });
  it("refuses links to this website, with or without www", () => {
    expect(codeOf(() => parseDestination("https://toolspro.com/tools", ["toolspro.com"]))).toBe("INVALID_URL");
    expect(codeOf(() => parseDestination("https://www.toolspro.com/", ["toolspro.com"]))).toBe("INVALID_URL");
    expect(codeOf(() => parseDestination("https://toolspro.com/", ["www.ToolsPro.com"]))).toBe("INVALID_URL");
    expect(parseDestination("https://other.com/", ["toolspro.com", ""])).toBe("https://other.com/");
    expect(parseDestination("https://nottoolspro.com/", ["toolspro.com"])).toBe("https://nottoolspro.com/");
  });
  it("refuses other short link services and their subdomains", () => {
    for (const text of ["https://bit.ly/abc", "tinyurl.com/x", "https://www.bit.ly/abc", "https://go.t.co/x", "https://T.CO/abc"]) {
      expect(codeOf(() => parseDestination(text))).toBe("INVALID_URL");
    }
    expect(parseDestination("https://orbit.ly.example.com/x")).toBe("https://orbit.ly.example.com/x");
    expect(parseDestination("https://habit.ly/x")).toBe("https://habit.ly/x");
  });
});