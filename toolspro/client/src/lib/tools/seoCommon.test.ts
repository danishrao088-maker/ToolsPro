import { describe, expect, it } from "vitest";
import { checkHttpUrl, cleanText, escapeMarkup } from "./seoCommon";

describe("escapeMarkup", () => {
  it("escapes all five special characters", () => {
    expect(escapeMarkup(`& < > " '`)).toBe("&amp; &lt; &gt; &quot; &#39;");
  });

  it("leaves normal text unchanged", () => {
    expect(escapeMarkup("Hello, world 123")).toBe("Hello, world 123");
  });
});

describe("checkHttpUrl", () => {
  it("accepts http and https addresses and normalizes them", () => {
    expect(checkHttpUrl("HTTPS://Example.COM/Path", "URL")).toEqual({ ok: true, href: "https://example.com/Path" });
    expect(checkHttpUrl("http://example.com", "URL")).toEqual({ ok: true, href: "http://example.com/" });
  });

  it("rejects other schemes", () => {
    for (const value of ["javascript:alert(1)", "ftp://example.com", "data:text/html,hi"]) {
      expect(checkHttpUrl(value, "URL").ok, value).toBe(false);
    }
  });

  it("rejects missing schemes, spaces, credentials and empty input", () => {
    for (const value of ["example.com", "https://exa mple.com", "https://user:pass@example.com", "", "   "]) {
      expect(checkHttpUrl(value, "URL").ok, value).toBe(false);
    }
  });
});

describe("cleanText", () => {
  it("collapses whitespace and line breaks", () => {
    expect(cleanText("  one \n two\t three  ")).toBe("one two three");
  });
});