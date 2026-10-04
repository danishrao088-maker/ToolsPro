import { describe, expect, it } from "vitest";
import { generateMetaTags, type MetaTagInput } from "./metaTags";
import { error, message, output } from "./testHelpers";

const base: MetaTagInput = {
  title: "My Page",
  description: "A short description.",
  keywords: "",
  author: "",
  canonicalUrl: "",
  robots: "index, follow",
  includeViewport: true,
};

describe("generateMetaTags", () => {
  it("builds the basic tags", () => {
    expect(output(generateMetaTags(base))).toBe(
      [
        '<meta charset="UTF-8">',
        '<meta name="viewport" content="width=device-width, initial-scale=1.0">',
        "<title>My Page</title>",
        '<meta name="description" content="A short description.">',
        '<meta name="robots" content="index, follow">',
      ].join("\n")
    );
  });

  it("escapes special characters in the title and description", () => {
    const out = output(
      generateMetaTags({ ...base, title: "Tom & Jerry <Show>", description: `Say "hi" & 'bye'` })
    );
    expect(out).toContain("<title>Tom &amp; Jerry &lt;Show&gt;</title>");
    expect(out).toContain('content="Say &quot;hi&quot; &amp; &#39;bye&#39;"');
  });

  it("leaves out the viewport tag when turned off", () => {
    expect(output(generateMetaTags({ ...base, includeViewport: false }))).not.toContain("viewport");
  });

  it("cleans and de-duplicates keywords", () => {
    const out = output(generateMetaTags({ ...base, keywords: " seo , Tools,seo, ,free  " }));
    expect(out).toContain('<meta name="keywords" content="seo, Tools, free">');
  });

  it("adds the author, robots and canonical tags", () => {
    const out = output(
      generateMetaTags({ ...base, author: "Ali", robots: "noindex, nofollow", canonicalUrl: "https://Example.com/a" })
    );
    expect(out).toContain('<meta name="author" content="Ali">');
    expect(out).toContain('<meta name="robots" content="noindex, nofollow">');
    expect(out).toContain('<link rel="canonical" href="https://example.com/a">');
  });

  it("rejects an unsafe or incomplete canonical address", () => {
    expect(error(generateMetaTags({ ...base, canonicalUrl: "javascript:alert(1)" }))).toContain("Canonical URL");
    expect(error(generateMetaTags({ ...base, canonicalUrl: "example.com" }))).toContain("Canonical URL");
  });

  it("requires a title and a description", () => {
    expect(error(generateMetaTags({ ...base, title: "  " }))).toBe("Enter a page title.");
    expect(error(generateMetaTags({ ...base, description: "" }))).toBe("Enter a page description.");
  });

  it("mentions long titles and descriptions in the message", () => {
    const long = generateMetaTags({ ...base, title: "a".repeat(61), description: "b".repeat(161) });
    expect(message(long)).toContain("61 characters");
    expect(message(long)).toContain("161 characters");
    expect(message(generateMetaTags(base))).not.toContain("cut off");
  });

  it("rejects values over the hard limits", () => {
    expect(error(generateMetaTags({ ...base, title: "a".repeat(201) }))).toContain("too long");
    expect(error(generateMetaTags({ ...base, description: "a".repeat(501) }))).toContain("too long");
  });
});