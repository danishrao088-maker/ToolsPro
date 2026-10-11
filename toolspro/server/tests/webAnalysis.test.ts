import { describe, expect, it } from "vitest";
import { parseHtml } from "../src/services/htmlParse";
import { analyzeMeta, analyzeOpenGraph, scorePage, snoopPage, type PageInfo } from "../src/services/webAnalysis";

const page: PageInfo = { url: "https://example.com/blog/post", status: 200, headers: { "content-type": "text/html; charset=utf-8", server: "nginx" }, timeMs: 320, bodyBytes: 5000, truncated: false, redirects: 0 };

const words = (n: number) => Array.from({ length: n }, (_, i) => `word${i}`).join(" ");
const title45 = "A good page title of a sensible length here!";
const desc100 = "This description is written to be long enough to count as a proper summary of the page for readers.";

const good = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${title45}</title>
<meta name="description" content="${desc100}"><meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="canonical" href="https://example.com/blog/post"><link rel="icon" href="/f.ico">
<meta property="og:title" content="OG"><meta property="og:image" content="https://example.com/i.png"></head>
<body><h1>Heading</h1><img src="a.png" alt="x"><p>${words(320)}</p></body></html>`;

const bare = `<html><head></head><body><p>hi</p><img src="a.png"></body></html>`;

const byId = <T extends { id: string }>(items: T[], id: string) => items.find((item) => item.id === id)!;

describe("analyzeMeta", () => {
  it("passes a well-built page", () => {
    const result = analyzeMeta(parseHtml(good), page);
    for (const id of ["title", "description", "canonical", "viewport", "charset", "language", "h1", "icon"]) expect(byId(result.checks, id).level, id).toBe("good");
    expect(result.summary.missing).toBe(0);
    expect(result.summary.warning).toBe(0);
  });

  it("flags a bare page", () => {
    const result = analyzeMeta(parseHtml(bare), page);
    expect(byId(result.checks, "title").level).toBe("missing");
    expect(byId(result.checks, "description").level).toBe("missing");
    expect(byId(result.checks, "viewport").level).toBe("missing");
    expect(byId(result.checks, "canonical").level).toBe("warning");
    expect(byId(result.checks, "language").level).toBe("warning");
    expect(byId(result.checks, "h1").level).toBe("warning");
    expect(byId(result.checks, "charset").value).toBe("utf-8"); // header se mila
  });

  it("warns about short and long titles and descriptions", () => {
    const short = analyzeMeta(parseHtml(`<title>Hi</title><meta name="description" content="short">`), page);
    expect(byId(short.checks, "title").level).toBe("warning");
    expect(byId(short.checks, "description").level).toBe("warning");
    const long = analyzeMeta(parseHtml(`<title>${"x".repeat(80)}</title><meta name="description" content="${"y".repeat(200)}">`), page);
    expect(byId(long.checks, "title").message).toContain("80 characters");
    expect(byId(long.checks, "description").level).toBe("warning");
  });

  it("understands robots tags and the X-Robots-Tag header", () => {
    expect(byId(analyzeMeta(parseHtml(`<meta name="robots" content="noindex, follow">`), page).checks, "robots").level).toBe("warning");
    expect(byId(analyzeMeta(parseHtml(`<meta name="robots" content="NOFOLLOW">`), page).checks, "robots").level).toBe("info");
    expect(byId(analyzeMeta(parseHtml(`<meta name="robots" content="index, follow">`), page).checks, "robots").level).toBe("good");
    expect(byId(analyzeMeta(parseHtml(``), { ...page, headers: { "x-robots-tag": "noindex" } }).checks, "robots").level).toBe("warning");
  });

  it("handles relative and different canonical links, and several H1s", () => {
    const relative = analyzeMeta(parseHtml(`<link rel="canonical" href="/blog/post">`), page);
    expect(byId(relative.checks, "canonical").value).toBe("https://example.com/blog/post");
    expect(byId(relative.checks, "canonical").message).toContain("points to this page");
    const other = analyzeMeta(parseHtml(`<link rel="canonical" href="https://example.com/other"><h1>a</h1><h1>b</h1>`), page);
    expect(byId(other.checks, "canonical").message).toContain("different");
    expect(byId(other.checks, "h1").value).toBe("2 found");
  });

  it("lists the meta tags", () => {
    const result = analyzeMeta(parseHtml(good), page);
    expect(result.allMeta.map((m) => m.name)).toEqual(expect.arrayContaining(["description", "viewport", "og:title"]));
  });
});

describe("analyzeOpenGraph", () => {
  const full = `<title>T</title><meta property="og:title" content="Shared title"><meta property="og:type" content="article">
<meta property="og:url" content="https://example.com/blog/post"><meta property="og:image" content="/img/cover.png">
<meta property="og:description" content="Shared description"><meta property="og:site_name" content="Example">
<meta name="twitter:card" content="summary_large_image"><meta property="article:author" content="Ali"><meta property="og:locale" content="en_US">`;

  it("finds the tags and builds a preview with a full image address", () => {
    const result = analyzeOpenGraph(parseHtml(full), page);
    const og = (tag: string) => result.openGraph.find((c) => c.tag === tag)!;
    expect(og("og:title").level).toBe("good");
    expect(og("og:image").level).toBe("warning"); // relative address
    expect(og("og:image:alt").level).toBe("warning");
    expect(result.preview).toEqual({ title: "Shared title", description: "Shared description", image: "https://example.com/img/cover.png", siteName: "Example", host: "example.com" });
    expect(result.twitter.find((c) => c.tag === "twitter:card")!.level).toBe("good");
    expect(result.twitter.find((c) => c.tag === "twitter:title")!.level).toBe("info");
    expect(result.otherTags.map((t) => t.tag).sort()).toEqual(["article:author", "og:locale"]);
  });

  it("marks missing required tags and falls back to the page title", () => {
    const result = analyzeOpenGraph(parseHtml(`<title>Plain title</title><meta name="description" content="Plain desc">`), page);
    expect(result.openGraph.filter((c) => c.level === "missing").map((c) => c.tag)).toEqual(["og:title", "og:type", "og:url", "og:image"]);
    expect(result.preview).toMatchObject({ title: "Plain title", description: "Plain desc", image: null, siteName: "example.com" });
    expect(result.twitter.find((c) => c.tag === "twitter:image")!.level).toBe("warning");
    expect(result.summary.missing).toBe(4);
  });
});

describe("snoopPage", () => {
  const html = `<html lang="en"><head><title>S</title><script src="/a.js"></script><script>1</script><link rel="stylesheet" href="/c.css"></head><body>
<h1>One</h1><h2>Two</h2><h2>Three</h2>
<a href="/inside">In</a><a href="https://www.example.com/www">Same host</a><a href="https://other.org/x" rel="nofollow noopener">Out</a>
<a href="/inside">Dup</a><a href="#top">Top</a><a href="mailto:a@b.com">Mail</a><a href="javascript:void(0)">JS</a>
<img src="1.png" alt="ok"><img src="2.png" alt=""><img src="3.png"><p>${words(10)}</p></body></html>`;
  const snoop = snoopPage(parseHtml(html), page);

  it("counts links by kind and de-duplicates the list", () => {
    expect(snoop.links).toMatchObject({ total: 7, internal: 3, external: 1, nofollow: 1, other: 3 });
    expect(snoop.links.items.map((l) => l.href)).toEqual(["https://example.com/inside", "https://www.example.com/www", "https://other.org/x"]);
    expect(snoop.links.items[2]).toMatchObject({ external: true, nofollow: true });
  });

  it("summarises headings, images, scripts and the response", () => {
    expect(snoop.headingCounts).toMatchObject({ h1: 1, h2: 2, h3: 0 });
    expect(snoop.images).toEqual({ total: 3, missingAlt: 1, emptyAlt: 1 });
    expect(snoop.scripts).toEqual({ total: 2, inline: 1, external: 1 });
    expect(snoop.stylesheets).toBe(1);
    expect(snoop.responseTimeMs).toBe(320);
    expect(snoop.headers.map((h) => h.name)).toEqual(["content-type", "server"]);
    expect(snoop.wordCount).toBeGreaterThan(10);
  });
});

describe("scorePage", () => {
  it("gives a full score to a well-built page", () => {
    const result = scorePage(parseHtml(good), page);
    expect(result.score).toBe(100);
    expect(result.verdict).toBe("good");
    expect(result.checks.reduce((sum, c) => sum + c.max, 0)).toBe(100);
    expect(result.checks.every((c) => c.status === "pass")).toBe(true);
  });

  it("gives a low score to a bare page and explains each check", () => {
    const result = scorePage(parseHtml(bare), { ...page, url: "http://example.com/", timeMs: 4000 });
    expect(byId(result.checks, "https").points).toBe(0);
    expect(byId(result.checks, "title").status).toBe("fail");
    expect(byId(result.checks, "alt").points).toBe(0);
    expect(byId(result.checks, "speed").points).toBe(0);
    expect(byId(result.checks, "indexable").points).toBe(10);
    expect(result.verdict).toBe("poor");
    expect(result.score).toBeLessThan(50);
    expect(result.checks.every((c) => c.message !== "")).toBe(true);
  });

  it("penalises noindex, a bad status, several H1s and partial alt text", () => {
    const html = `<html lang="en"><meta name="robots" content="noindex"><h1>a</h1><h1>b</h1>${'<img src="x.png" alt="ok">'.repeat(4)}<img src="y.png"></html>`;
    const result = scorePage(parseHtml(html), { ...page, status: 404 });
    expect(byId(result.checks, "indexable").points).toBe(0);
    expect(byId(result.checks, "status").points).toBe(0);
    expect(byId(result.checks, "h1").points).toBe(4);
    expect(byId(result.checks, "alt").points).toBe(4);
  });

  it("scores the amount of text and the speed in steps", () => {
    const two = (wordsCount: number, timeMs: number) => scorePage(parseHtml(`<body>${words(wordsCount)}</body>`), { ...page, timeMs });
    expect(byId(two(320, 100).checks, "content").points).toBe(7);
    expect(byId(two(200, 100).checks, "content").points).toBe(3);
    expect(byId(two(20, 100).checks, "content").points).toBe(0);
    expect(byId(two(20, 2000).checks, "speed").points).toBe(2);
  });
});
