import { describe, expect, it } from "vitest";
import {
  decodeEntities,
  metaValue,
  parseHtml,
} from "../src/services/htmlParse";

const page = `<!DOCTYPE html>
<html lang="en-US">
<head>
<meta charset="utf-8">
<title>  My &amp; Your Site
 </title>
<META NAME="Description" CONTENT="A short description &quot;here&quot;">
<meta name='viewport' content='width=device-width, initial-scale=1'>
<meta property="og:title" content="OG Title">
<link rel="canonical" href="https://example.com/page">
<link rel="stylesheet" href="/a.css"><link rel="Stylesheet preload" href="/b.css">
<link rel="alternate" hreflang="fr" href="/fr">
<script src="/app.js"></script>
<script>var s = "<title>fake</title><h1>fake</h1><a href='/x'>x</a>";</script>
<style>h1 { color: red } /* <h1>no</h1> */</style>
<!-- <meta name="robots" content="noindex"> <h1>commented</h1> -->
</head>
<body class="x">
<h1>Main <span>heading</span></h1>
<h2 id="s">Sub &amp; more</h2>
<p>One two three four five. A > b and 1 < 2 stay as text.</p>
<a href="/about" rel="nofollow">About <b>us</b></a>
<a href="https://other.com/x?y=1&amp;z=2">Other</a>
<a name="anchor-only">no href</a>
<img src="/p.png" alt="A picture"><img src="/q.png" alt=""><img src="/r.png">
<img alt="tricky > alt" src="/t.png">
</body></html>`;

describe("parseHtml", () => {
  const parsed = parseHtml(page);

  it("reads title, language and meta tags", () => {
    expect(parsed.lang).toBe("en-US");
    expect(parsed.title).toBe("My & Your Site");
    expect(parsed.metas.find((m) => m.charset)?.charset).toBe("utf-8");
    expect(metaValue(parsed, "description")).toBe('A short description "here"');
    expect(metaValue(parsed, "viewport")).toBe(
      "width=device-width, initial-scale=1",
    );
    expect(metaValue(parsed, "og:title")).toBe("OG Title");
    expect(metaValue(parsed, "robots")).toBeNull();
  });

  it("reads links and counts stylesheets and scripts", () => {
    expect(parsed.links.find((l) => l.rel === "canonical")?.href).toBe(
      "https://example.com/page",
    );
    expect(parsed.links.find((l) => l.hreflang === "fr")?.href).toBe("/fr");
    expect(parsed.stylesheetCount).toBe(2);
    expect(parsed.scriptCount).toBe(2);
    expect(parsed.inlineScriptCount).toBe(1);
  });

  it("ignores things inside scripts, styles and comments", () => {
    expect(parsed.headings.map((h) => h.text)).toEqual([
      "Main heading",
      "Sub & more",
    ]);
    expect(parsed.anchors.map((a) => a.href)).toEqual([
      "/about",
      "https://other.com/x?y=1&z=2",
    ]);
    expect(parsed.title).not.toContain("fake");
  });

  it("reads headings, anchors and images", () => {
    expect(parsed.headings.map((h) => h.level)).toEqual([1, 2]);
    expect(parsed.anchors[0]).toEqual({
      href: "/about",
      text: "About us",
      rel: "nofollow",
    });
    expect(parsed.images).toEqual([
      { src: "/p.png", alt: "A picture" },
      { src: "/q.png", alt: "" },
      { src: "/r.png", alt: null },
      { src: "/t.png", alt: "tricky > alt" },
    ]);
  });

  it("counts the words of the page body", () => {
    // Main heading Sub & more One two three four five. A > b and 1 < 2 stay as text. About us Other  (title and scripts not counted)
    expect(parsed.wordCount).toBe(2 + 3 + 17 + 2 + 1);
  });
});

describe("parseHtml on odd input", () => {
  it("handles empty and plain text", () => {
    expect(parseHtml("").wordCount).toBe(0);
    expect(parseHtml("just some words").wordCount).toBe(3);
    expect(parseHtml("").title).toBeNull();
  });

  it("does not hang on unclosed tags and huge junk", () => {
    const started = Date.now();
    const junk =
      "<a href='x'>".repeat(20000) +
      "<h1>".repeat(20000) +
      "<".repeat(50000) +
      "<script>".repeat(5000) +
      "<!-- never closed";
    const parsed = parseHtml(junk);
    expect(Date.now() - started).toBeLessThan(2000);
    expect(parsed.anchors.length).toBeLessThanOrEqual(5000);
  });

  it("keeps the first value of a repeated attribute and the first title", () => {
    const parsed = parseHtml(
      '<title>First</title><title>Second</title><a href="/one" href="/two">x</a><html lang="fr">',
    );
    expect(parsed.title).toBe("First");
    expect(parsed.anchors[0]!.href).toBe("/one");
    expect(parsed.lang).toBe("fr");
  });

  it("handles a title with no closing tag", () => {
    const parsed = parseHtml("<title>Open title " + "x".repeat(3000));
    expect(parsed.title!.length).toBeLessThanOrEqual(1000);
  });
});

describe("decodeEntities", () => {
  it("decodes common and numeric entities and leaves unknown ones", () => {
    expect(
      decodeEntities("a &amp; b &lt;c&gt; &#65;&#x42; &unknown; &#99999999;"),
    ).toBe("a & b <c> AB &unknown; &#99999999;");
  });
});
