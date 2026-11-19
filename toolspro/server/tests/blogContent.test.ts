import { describe, expect, it } from "vitest";
import {
  cleanContent,
  countWords,
  decodeEntities,
  escapeHtml,
  escapeXml,
  expandSeoTemplate,
  fallbackTitle,
  makeExcerpt,
  readingMinutes,
  stripTags,
} from "../src/blog/content";

describe("blog content helpers", () => {
  it("decodes named and numeric entities", () => {
    expect(decodeEntities("Tom &amp; Jerry &#8211; &#x41;&nbsp;B")).toContain("Tom & Jerry");
    expect(decodeEntities("&#8211;")).toBe("–");
    expect(decodeEntities("&#x41;")).toBe("A");
  });

  it("escapes HTML and XML special characters", () => {
    expect(escapeHtml(`<a href="x">&'</a>`)).toBe("&lt;a href=&quot;x&quot;&gt;&amp;&#39;&lt;/a&gt;");
    expect(escapeXml("<a>&</a>")).toBe("&lt;a&gt;&amp;&lt;/a&gt;");
  });

  it("strips tags and counts words", () => {
    expect(stripTags("<p>Hello <b>big</b> world</p>").replace(/\s+/g, " ").trim()).toBe("Hello big world");
    expect(countWords("<p>one two three</p>")).toBe(3);
  });

  it("estimates reading time with a minimum of 1 minute", () => {
    expect(readingMinutes("<p>short</p>")).toBe(1);
    expect(readingMinutes(`<p>${"word ".repeat(660)}</p>`)).toBe(3);
  });

  it("makes a short excerpt without cutting inside tags", () => {
    const ex = makeExcerpt(`<p>${"alpha ".repeat(100)}</p>`, 50);
    expect(ex.length).toBeLessThanOrEqual(55);
    expect(ex).not.toContain("<");
  });

  it("builds a fallback title from the first heading, else from the slug", () => {
    expect(fallbackTitle("<h2>My Heading</h2><p>x</p>", "slug-here")).toBe("My Heading");
    expect(fallbackTitle("<p>no heading</p>", "slug-here")).toBe("Slug here");
  });

  it("expands Yoast template variables", () => {
    const out = expandSeoTemplate("%%title%% %%sep%% %%sitename%%", { title: "Post", siteName: "Site" });
    expect(out).toBe("Post - Site");
  });

  it("cleanContent keeps data-src but drops other data attributes", () => {
    const html = cleanContent('<img src="a.jpg" data-src="b.jpg" data-foo="1" loading="eager">', ["thesourcefull.com"]);
    expect(html).toContain('data-src="b.jpg"');
    expect(html).not.toContain("data-foo");
    expect(html).toContain('loading="eager"');
  });

  it("cleanContent rewrites www and bare-host links to relative ones", () => {
    const html = cleanContent(
      '<a href="https://www.thesourcefull.com/a/">a</a><a href="https://thesourcefull.com">home</a><a href="https://other.com/x">o</a>',
      ["thesourcefull.com"]
    );
    expect(html).toContain('href="/a/"');
    expect(html).toContain('href="/"');
    expect(html).toContain('href="https://other.com/x"');
  });
});
