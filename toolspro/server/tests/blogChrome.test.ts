import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { LEGAL_LINKS, MAIN_LINKS, siteFooter, siteHeader } from "../src/blog/chrome";
import { renderListing } from "../src/blog/render";

// React app ke menu ke links (client/src/data/navigation.ts) padh kar nikalna
function clientLinks(name: "mainLinks" | "legalLinks"): { label: string; path: string }[] {
  const file = readFileSync(path.resolve(process.cwd(), "../client/src/data/navigation.ts"), "utf8");
  const block = new RegExp(`export const ${name}[^=]*=\\s*\\[([\\s\\S]*?)\\];`).exec(file)?.[1] ?? "";
  return [...block.matchAll(/label:\s*"([^"]+)",\s*path:\s*"([^"]+)"/g)].map((m) => ({ label: m[1], path: m[2] }));
}

describe("blog header and footer", () => {
  it("use the same menu links as the React app (same order)", () => {
    expect(clientLinks("mainLinks").length).toBeGreaterThan(0);
    expect(MAIN_LINKS).toEqual(clientLinks("mainLinks"));
    expect(LEGAL_LINKS).toEqual(clientLinks("legalLinks"));
  });

  it("header has the logo, all menu links, the buttons and a closed mobile menu", () => {
    const html = siteHeader();
    expect(html).toContain('class="skip-link" href="#main-content"');
    expect(html).toContain("Tools<span>Pro</span>");
    for (const item of MAIN_LINKS) expect(html).toContain(`href="${item.path}" class="nav-link`);
    for (const item of [...MAIN_LINKS, ...LEGAL_LINKS]) expect(html).toContain(`href="${item.path}" class="m-link`);
    expect(html).toContain('aria-label="Search tools"');
    expect(html).toContain('id="theme-toggle"');
    expect(html).toContain('id="menu-toggle"');
    expect(html).toMatch(/<nav id="mobile-menu"[^>]* hidden>/);
  });

  it("highlights only the Blog link", () => {
    const html = siteHeader();
    expect(html.match(/nav-link is-active/g)).toHaveLength(1);
    expect(html).toContain('href="/blog/" class="nav-link is-active">Blog</a>');
  });

  it("footer has the tagline, both link lists and the copyright line", () => {
    const html = siteFooter(2031);
    expect(html).toContain("Simple, powerful tools to make your everyday work easier.");
    expect(html).toContain("<h2>Navigation</h2>");
    expect(html).toContain("<h2>Legal</h2>");
    for (const item of [...MAIN_LINKS, ...LEGAL_LINKS]) expect(html).toContain(`<a href="${item.path}">${item.label}</a>`);
    expect(html).toContain("&copy; 2031 ToolsPro. All rights reserved.");
    expect(html).not.toContain("is-active");
  });

  it("blog pages use them and load only external scripts (the server CSP blocks inline ones)", () => {
    const html = renderListing({ heading: "Blog", basePath: "/blog/", page: 1, totalPages: 1, items: [] });
    expect(html).toContain('<header class="site-header">');
    expect(html).toContain('<footer class="site-footer">');
    expect(html).toContain('<main id="main-content"');
    expect(html).toContain('<script src="/theme-init.js"></script>');
    expect(html).toContain('<script src="/blog-chrome.js" defer></script>');
    const scripts = [...html.matchAll(/<script\b([^>]*)>/g)].map((m) => m[1]);
    for (const attrs of scripts) expect(attrs, attrs).toMatch(/src="|type="application\/ld\+json"/);
  });
});
