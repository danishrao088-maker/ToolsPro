import { describe, expect, it } from "vitest";
import { parseHtml } from "../src/services/htmlParse";
import { scanHtml } from "../src/services/htmlScan";
import { analyzeMobile, fixedWidthCount, readViewport, smallFontCount } from "../src/services/mobileCheck";
import { checkSpeed, type Compression } from "../src/services/speedCheck";
import type { PageInfo } from "../src/services/webAnalysis";

const page = (over: Partial<PageInfo> = {}): PageInfo => ({ url: "https://example.com/", status: 200, headers: {}, timeMs: 300, bodyBytes: 20_000, truncated: false, redirects: 0, ...over });
const check = (result: { checks: { id: string; points: number; status: string }[] }, id: string) => result.checks.find((c) => c.id === id)!;

describe("readViewport", () => {
  it("reads a good tag", () => {
    expect(readViewport("width=device-width, initial-scale=1")).toMatchObject({ present: true, deviceWidth: true, zoomBlocked: false });
  });
  it("spots blocked zoom", () => {
    expect(readViewport("width=device-width, user-scalable=no").zoomBlocked).toBe(true);
    expect(readViewport("width=device-width, user-scalable=0").zoomBlocked).toBe(true);
    expect(readViewport("width=device-width, maximum-scale=1").zoomBlocked).toBe(true);
    expect(readViewport("width=device-width, maximum-scale=5").zoomBlocked).toBe(false);
  });
  it("spots a fixed width and a missing tag", () => {
    expect(readViewport("width=1024").deviceWidth).toBe(false);
    expect(readViewport(null).present).toBe(false);
  });
});

describe("small helpers", () => {
  it("counts small fonts", () => {
    expect(smallFontCount("a{font-size:10px} b{font-size: 11.5px} c{font-size:12px} d{font-size:1em}")).toBe(2);
  });
  it("counts wide fixed elements", () => {
    const scan = scanHtml('<div style="width: 700px"></div><div style="max-width:900px"></div><div style="min-width:800px;width:300px"></div><table width="900"></table>');
    expect(fixedWidthCount(scan)).toBe(2);
  });
});

const goodHtml = `<html lang="en"><head><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="theme-color" content="#000">
<style>@media (max-width: 700px) { .a { display: none } }</style></head><body><img src="a.png" srcset="a2.png 2x"></body></html>`;

describe("analyzeMobile", () => {
  const run = (html: string, css = { linked: 0, texts: [] as string[] }, p = page()) => analyzeMobile(parseHtml(html), p, html, css);

  it("gives a good page a high score", () => {
    const out = run(goodHtml);
    expect(out.verdict).toBe("good");
    expect(out.score).toBeGreaterThanOrEqual(95);
    expect(out.checks.reduce((sum, c) => sum + c.max, 0)).toBe(100);
  });
  it("marks a page without a viewport tag as poor whatever else it has", () => {
    const out = run(goodHtml.replace(/<meta name="viewport"[^>]*>/, ""));
    expect(out.verdict).toBe("poor");
    expect(check(out, "viewport").points).toBe(0);
  });
  it("gives half marks when the viewport does not use device width", () => {
    expect(check(run(goodHtml.replace("width=device-width", "width=1024")), "viewport").points).toBe(15);
  });
  it("flags blocked zoom, plugins, fixed widths and small text", () => {
    const html = `<html><head><meta name="viewport" content="width=device-width, user-scalable=no"></head><body>
      <object type="application/x-shockwave-flash"></object><div style="width:900px;font-size:9px"></div></body></html>`;
    const out = run(html);
    expect(check(out, "zoom").points).toBe(0);
    expect(check(out, "plugins").points).toBe(0);
    expect(check(out, "fixed-width").points).toBe(0);
    expect(check(out, "font-size").points).toBeLessThan(10);
  });
  it("finds media queries in a linked stylesheet", () => {
    const html = goodHtml.replace(/<style>[\s\S]*<\/style>/, "");
    expect(check(run(html), "responsive").points).toBe(8);
    expect(check(run(html, { linked: 1, texts: ["@media (min-width: 600px){a{b:c}}"] }), "responsive").points).toBe(15);
  });
  it("says when a stylesheet could not be read", () => {
    const html = goodHtml.replace(/<style>[\s\S]*<\/style>/, "");
    const out = run(html, { linked: 3, texts: ["a{}"] });
    expect(check(out, "responsive").points).toBe(8);
    expect(out.checks.find((c) => c.id === "responsive")!.message).toContain("1 of 3");
  });
  it("counts small text from linked stylesheets too", () => {
    const html = goodHtml.replace(/<style>[\s\S]*<\/style>/, "");
    expect(check(run(html, { linked: 1, texts: [".x{font-size:8px}.y{font-size:9px}"] }), "font-size").points).toBe(5);
  });
  it("penalises http pages", () => {
    expect(check(run(goodHtml, undefined, page({ url: "http://example.com/" })), "https").points).toBe(0);
  });
  it("always explains its limits", () => {
    expect(run(goodHtml).note).toContain("cannot see how the page really looks");
  });
});

const fast = `<html><head><link rel="stylesheet" href="/a.css"><script src="/a.js" defer></script></head><body>
<img src="/1.png" width="10" height="10"><img src="/2.png" width="10" height="10"></body></html>`;
const gz: Compression = { checked: true, encoding: "gzip" };

describe("checkSpeed", () => {
  const run = (html: string, p = page(), c: Compression = gz) => checkSpeed(parseHtml(html), scanHtml(html), p, c);

  it("gives a lean page a high score and the weights add up to 100", () => {
    const out = run(fast, page({ headers: { "cache-control": "max-age=60" } }));
    expect(out.score).toBe(100);
    expect(out.verdict).toBe("good");
    expect(out.checks.reduce((sum, c) => sum + c.max, 0)).toBe(100);
  });
  it("scores load time in steps", () => {
    expect(check(run(fast, page({ timeMs: 500 })), "response").points).toBe(20);
    expect(check(run(fast, page({ timeMs: 1000 })), "response").points).toBe(12);
    expect(check(run(fast, page({ timeMs: 2000 })), "response").points).toBe(6);
    expect(check(run(fast, page({ timeMs: 5000 })), "response").points).toBe(0);
  });
  it("scores html size and a truncated page", () => {
    expect(check(run(fast, page({ bodyBytes: 200 * 1024 })), "html-size").points).toBe(6);
    expect(check(run(fast, page({ bodyBytes: 900 * 1024 })), "html-size").points).toBe(3);
    expect(check(run(fast, page({ bodyBytes: 1_000_000, truncated: true })), "html-size").points).toBe(0);
  });
  it("checks compression", () => {
    expect(check(run(fast, page(), { checked: true, encoding: "br" }), "compression").points).toBe(10);
    expect(check(run(fast, page(), { checked: true, encoding: null }), "compression").points).toBe(0);
    expect(check(run(fast, page({ bodyBytes: 500 }), { checked: true, encoding: null }), "compression").points).toBe(10);
    expect(check(run(fast, page(), { checked: false, encoding: null }), "compression").points).toBe(5);
  });
  it("counts scripts in the head that block", () => {
    const one = `<html><head><script src="/a.js"></script></head><body></body></html>`;
    const three = `<html><head>${'<script src="/x.js"></script>'.repeat(3)}</head><body></body></html>`;
    expect(check(run(one), "blocking").points).toBe(8);
    expect(check(run(three), "blocking").points).toBe(0);
    expect(check(run(fast), "blocking").points).toBe(15);
  });
  it("counts files and other websites", () => {
    const many = `<html><head>${Array.from({ length: 30 }, (_, i) => `<script src="https://cdn${i % 10}.other.com/${i}.js" async></script>`).join("")}</head><body></body></html>`;
    const out = run(many);
    expect(check(out, "requests").points).toBe(5);
    expect(check(out, "third-party").points).toBe(0);
    expect(out.checks.find((c) => c.id === "third-party")!.message).toContain("10 other sites");
  });
  it("treats www and the same host as one site", () => {
    const html = `<html><head><script src="https://www.example.com/a.js" async></script><script src="//example.com/b.js" async></script></head></html>`;
    expect(check(run(html), "third-party").points).toBe(5);
  });
  it("checks image sizes and lazy loading", () => {
    const imgs = Array.from({ length: 8 }, () => `<img src="/a.png">`).join("");
    const lazy = Array.from({ length: 8 }, (_, i) => `<img src="/a.png" width="1" height="1" ${i >= 3 ? 'loading="lazy"' : ""}>`).join("");
    expect(check(run(`<body>${imgs}</body>`), "dimensions").points).toBe(0);
    expect(check(run(`<body>${imgs}</body>`), "lazy").points).toBe(0);
    expect(check(run(`<body>${lazy}</body>`), "dimensions").points).toBe(10);
    expect(check(run(`<body>${lazy}</body>`), "lazy").points).toBe(5);
  });
  it("scores redirects, caching and https", () => {
    expect(check(run(fast, page({ redirects: 1 })), "redirects").points).toBe(3);
    expect(check(run(fast, page({ redirects: 3 })), "redirects").points).toBe(0);
    expect(check(run(fast), "caching").points).toBe(0);
    expect(check(run(fast, page({ headers: { etag: "x" } })), "caching").points).toBe(5);
    expect(check(run(fast, page({ url: "http://example.com/" })), "https").points).toBe(0);
  });
  it("is honest about what it measures", () => {
    expect(run(fast).note).toContain("does not measure what real visitors feel");
  });
});