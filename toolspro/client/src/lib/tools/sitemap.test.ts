import { describe, expect, it } from "vitest";
import { MAX_SITEMAP_URLS, generateSitemap, type ChangeFrequency, type SitemapInput } from "./sitemap";
import { error, message, output } from "./testHelpers";

const base: SitemapInput = {
  urls: "https://example.com/\nhttps://example.com/about",
  changefreq: "",
  priority: "",
  lastmod: "",
};

describe("generateSitemap", () => {
  it("builds a sitemap with only the address", () => {
    expect(output(generateSitemap(base))).toBe(
      [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
        "  <url>",
        "    <loc>https://example.com/</loc>",
        "  </url>",
        "  <url>",
        "    <loc>https://example.com/about</loc>",
        "  </url>",
        "</urlset>",
        "",
      ].join("\n")
    );
  });

  it("escapes ampersands in addresses", () => {
    const out = output(generateSitemap({ ...base, urls: "https://example.com/a?x=1&y=2" }));
    expect(out).toContain("<loc>https://example.com/a?x=1&amp;y=2</loc>");
  });

  it("adds the optional elements to every address", () => {
    const out = output(
      generateSitemap({ ...base, lastmod: "2026-10-04", changefreq: "weekly", priority: "0.8" })
    );
    expect(out.match(/<lastmod>2026-10-04<\/lastmod>/g)?.length).toBe(2);
    expect(out.match(/<changefreq>weekly<\/changefreq>/g)?.length).toBe(2);
    expect(out.match(/<priority>0\.8<\/priority>/g)?.length).toBe(2);
  });

  it("removes duplicates and says so", () => {
    const result = generateSitemap({
      ...base,
      urls: "https://example.com/\nhttps://example.com/\nhttps://example.com",
    });
    expect((output(result).match(/<loc>/g) ?? []).length).toBe(1);
    expect(message(result)).toContain("2 duplicate addresses");
  });

  it("reports the line number of an invalid address", () => {
    const text = error(generateSitemap({ ...base, urls: "https://example.com/\nnot a url\nhttps://example.com/x" }));
    expect(text).toContain("Line 2");
  });

  it("rejects addresses from more than one site", () => {
    const text = error(generateSitemap({ ...base, urls: "https://example.com/\nhttps://other.com/" }));
    expect(text).toContain("other.com");
    expect(text).toContain("example.com");
  });

  it("requires at least one address", () => {
    expect(error(generateSitemap({ ...base, urls: "  \n " }))).toBe("Enter at least one web address.");
  });

  it("rejects too many addresses", () => {
    const urls = Array.from({ length: MAX_SITEMAP_URLS + 1 }, (_, i) => `https://example.com/${i}`).join("\n");
    expect(error(generateSitemap({ ...base, urls }))).toContain("Too many");
  });

  it("rejects a date that does not exist", () => {
    expect(error(generateSitemap({ ...base, lastmod: "2026-02-30" }))).toContain("real date");
  });

  it("handles Windows line endings and blank lines", () => {
    const out = output(generateSitemap({ ...base, urls: "\r\nhttps://example.com/a\r\n\r\nhttps://example.com/b\r\n" }));
    expect((out.match(/<loc>/g) ?? []).length).toBe(2);
  });

  it("rejects an unknown frequency or priority", () => {
    expect(error(generateSitemap({ ...base, changefreq: "sometimes" as ChangeFrequency }))).toContain("frequency");
    expect(error(generateSitemap({ ...base, priority: "2.0" }))).toContain("priority");
  });
});