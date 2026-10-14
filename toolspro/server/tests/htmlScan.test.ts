import { describe, expect, it } from "vitest";
import { scanHtml } from "../src/services/htmlScan";

const page = `<!doctype html><html><head>
<meta name="theme-color" content="#fff">
<link rel="stylesheet" href="/a.css"><link rel="stylesheet" href="/print.css" media="print and (max-width: 600px)">
<link rel="apple-touch-icon" href="/i.png"><link rel="manifest" href="/m.json">
<script src="/blocking.js"></script><script src="/a.js" async></script><script src="/d.js" defer></script><script type="module" src="/m.js"></script>
<script>var x = "<img src='fake.png'>";</script>
<style>@media (max-width: 600px) { body { font-size: 10px } }</style>
<!-- <img src="commented.png"> -->
</head><body>
<img src="/a.png" width="600" height="400" alt="a"><img src='/b.png' loading="lazy" srcset="b2.png 2x"><IMG SRC=/c.png>
<table width="800"><tr><td width="50%">x</td></tr></table>
<div style="width: 700px; color: red">x</div><div style="max-width:900px">y</div>
<object type="application/x-shockwave-flash" data="x.swf"></object><embed src="movie.swf"><object data="chart.svg"></object>
<script src="/late.js"></script>
</body></html>`;

describe("scanHtml", () => {
  const scan = scanHtml(page);
  it("reads scripts and whether they block", () => {
    expect(scan.scripts.map((s) => [s.src, s.async, s.defer, s.module, s.inHead])).toEqual([
      ["/blocking.js", false, false, false, true],
      ["/a.js", true, false, false, true],
      ["/d.js", false, true, false, true],
      ["/m.js", false, false, true, true],
      [null, false, false, false, true],
      ["/late.js", false, false, false, false],
    ]);
  });
  it("reads stylesheets, inline css and phone extras", () => {
    expect(scan.stylesheets).toEqual([
      { href: "/a.css", media: null, inHead: true },
      { href: "/print.css", media: "print and (max-width: 600px)", inHead: true },
    ]);
    expect(scan.inlineCss).toContain("@media (max-width: 600px)");
    expect(scan.hasThemeColor && scan.hasTouchIcon && scan.hasManifest).toBe(true);
  });
  it("ignores tags inside scripts and comments", () => {
    expect(scan.images.map((i) => i.src)).toEqual(["/a.png", "/b.png", "/c.png"]);
  });
  it("reads image details", () => {
    expect(scan.images[0]).toEqual({ src: "/a.png", width: "600", height: "400", loading: null, srcset: false });
    expect(scan.images[1]).toMatchObject({ loading: "lazy", srcset: true, width: null });
  });
  it("counts wide fixed widths and style attributes", () => {
    expect(scan.fixedWidthAttributes).toBe(2); // img 600 aur table 800. td 50% nahi
    expect(scan.styleAttributes).toEqual(["width: 700px; color: red", "max-width:900px"]);
  });
  it("counts only real plugins", () => {
    expect(scan.plugins).toBe(2); // flash object aur swf embed. chart.svg nahi
  });
    it("copes with junk and huge input", () => {
    expect(scanHtml("").scripts).toEqual([]);
    expect(scanHtml("<<<>>><script").scripts.length).toBeLessThanOrEqual(1);
    const started = Date.now();
    scanHtml(`<div ${"a ".repeat(50_000)}`.repeat(20));
    scanHtml("<img ".repeat(100_000));
    scanHtml("<a ".repeat(333_000));
    scanHtml(`${"<a ".repeat(333_000)}>`);
    expect(Date.now() - started).toBeLessThan(3000);
  });
  it("treats all scripts as outside the head when there is no head", () => {
    expect(scanHtml('<script src="x.js"></script>').scripts[0]!.inHead).toBe(false);
  });
});