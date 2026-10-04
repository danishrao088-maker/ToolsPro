import { describe, expect, it } from "vitest";
import { generateRobotsTxt, type RobotsTxtInput } from "./robotsTxt";
import { error, message, output } from "./testHelpers";

const base: RobotsTxtInput = { mode: "allow-all", disallowPaths: "", allowPaths: "", sitemaps: "" };

describe("generateRobotsTxt", () => {
  it("allows everything", () => {
    expect(output(generateRobotsTxt(base))).toBe("User-agent: *\nDisallow:\n");
  });

  it("blocks everything", () => {
    expect(output(generateRobotsTxt({ ...base, mode: "block-all" }))).toBe("User-agent: *\nDisallow: /\n");
  });

  it("builds custom rules with a sitemap", () => {
    const out = output(
      generateRobotsTxt({
        mode: "custom",
        disallowPaths: "/admin/\n/private/",
        allowPaths: "/admin/public/",
        sitemaps: "https://example.com/sitemap.xml",
      })
    );
    expect(out).toBe(
      "User-agent: *\nDisallow: /admin/\nDisallow: /private/\nAllow: /admin/public/\n\nSitemap: https://example.com/sitemap.xml\n"
    );
  });

  it("handles Windows line endings, blank lines and extra spaces", () => {
    const out = output(generateRobotsTxt({ ...base, mode: "custom", disallowPaths: "  /a/ \r\n\r\n/b/\r\n" }));
    expect(out).toContain("Disallow: /a/\nDisallow: /b/");
  });

  it("removes duplicate paths and sitemaps", () => {
    const out = output(
      generateRobotsTxt({
        mode: "custom",
        disallowPaths: "/a/\n/a/",
        allowPaths: "",
        sitemaps: "https://example.com/s.xml\nhttps://example.com/s.xml",
      })
    );
    expect((out.match(/^Disallow: \/a\/$/gm) ?? []).length).toBe(1);
    expect((out.match(/^Sitemap: /gm) ?? []).length).toBe(1);
  });

  it("rejects a path that does not start with a slash", () => {
    expect(error(generateRobotsTxt({ ...base, mode: "custom", disallowPaths: "admin" }))).toContain(
      "must start with /"
    );
  });

  it("rejects paths with spaces or a hash sign", () => {
    expect(error(generateRobotsTxt({ ...base, mode: "custom", disallowPaths: "/a b" }))).toContain(
      "cannot contain spaces"
    );
    expect(error(generateRobotsTxt({ ...base, mode: "custom", disallowPaths: "/a#b" }))).toContain(
      "cannot contain #"
    );
  });

  it("rejects an invalid sitemap address", () => {
    expect(error(generateRobotsTxt({ ...base, sitemaps: "example.com/sitemap.xml" }))).toContain("Sitemap address");
  });

  it("needs at least one rule in custom mode", () => {
    expect(error(generateRobotsTxt({ ...base, mode: "custom" }))).toContain("at least one");
  });

  it("says when path rules are ignored", () => {
    const result = generateRobotsTxt({ ...base, disallowPaths: "/a/" });
    expect(message(result)).toContain("ignored");
    expect(output(result)).not.toContain("/a/");
  });
});