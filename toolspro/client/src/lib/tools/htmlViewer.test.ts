import { describe, expect, it } from "vitest";
import { MAX_HTML_LENGTH, buildPolicy, buildPreview } from "./htmlViewer";

const off = { allowScripts: false, allowExternal: false };

function documentOf(html: string, options = off): string {
  const result = buildPreview(html, options);
  if (!result.ok) throw new Error(result.error);
  return result.document;
}

describe("buildPreview", () => {
  it("wraps the code in a standards-mode document with the policy first", () => {
    const doc = documentOf("<p>Hello</p>");
    expect(doc.startsWith("<!doctype html>")).toBe(true);
    expect(doc).toContain("<body><p>Hello</p></body>");
    expect(doc.indexOf("Content-Security-Policy")).toBeLessThan(doc.indexOf("<p>Hello</p>"));
  });

  it("rejects empty input", () => {
    expect(buildPreview("   ", off)).toEqual({ ok: false, error: "Enter some HTML to preview." });
  });

  it("rejects input that is too long", () => {
    expect(buildPreview("a".repeat(MAX_HTML_LENGTH + 1), off).ok).toBe(false);
  });

  it("blocks scripts and other websites by default", () => {
    const policy = buildPolicy(off);
    expect(policy).toContain("default-src 'none'");
    expect(policy).not.toContain("script-src");
    expect(policy).not.toContain("https:");
  });

  it("allows inline scripts only when turned on", () => {
    expect(buildPolicy({ allowScripts: true, allowExternal: false })).toContain("script-src 'unsafe-inline'");
    expect(buildPolicy({ allowScripts: true, allowExternal: false })).not.toContain("https:");
  });

  it("allows https resources only when turned on", () => {
    const policy = buildPolicy({ allowScripts: true, allowExternal: true });
    expect(policy).toContain("img-src data: https:");
    expect(policy).toContain("script-src 'unsafe-inline' https:");
  });

  it("describes the chosen settings in the message", () => {
    const on = buildPreview("<p>x</p>", { allowScripts: true, allowExternal: true });
    const blocked = buildPreview("<p>x</p>", off);
    if (!on.ok || !blocked.ok) throw new Error("Expected success.");
    expect(on.message).toContain("Scripts are on");
    expect(blocked.message).toContain("Scripts are off");
    expect(blocked.message).toContain("Nothing is loaded");
  });
});