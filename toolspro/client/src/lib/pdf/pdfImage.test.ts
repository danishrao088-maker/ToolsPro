import { describe, expect, it } from "vitest";
import { MAX_RENDER_PAGES, pageImageName, pageRenderSize, renderTargets } from "./pdfImage";

describe("pageRenderSize", () => {
  it("converts points to pixels", () => {
    // A4 = 595.28 x 841.89 points
    expect(pageRenderSize(595.28, 841.89, 72)).toEqual({ ok: true, scale: 1, width: 595, height: 842 });
    const at150 = pageRenderSize(595.28, 841.89, 150);
    expect(at150.ok && [at150.width, at150.height]).toEqual([1240, 1754]);
    expect(at150.ok && at150.scale).toBeCloseTo(150 / 72, 10);
  });

  it("never returns a side smaller than 1 pixel", () => {
    expect(pageRenderSize(0.1, 0.1, 72)).toEqual({ ok: true, scale: 1, width: 1, height: 1 });
  });

  it("rejects pages that would be too big or have no size", () => {
    expect(pageRenderSize(10000, 100, 150).ok).toBe(false); // lambi side 20833 px
    expect(pageRenderSize(0, 100, 72).ok).toBe(false);
    expect(pageRenderSize(100, 100, 0).ok).toBe(false);
    expect(pageRenderSize(Number.NaN, 100, 72).ok).toBe(false);
  });

  it("limits the total number of pixels", () => {
    // 7000 x 7000 = 49M ok, 7200 x 7200 = 51.8M too many pixels, dono 8192 se chhote
    expect(pageRenderSize(7000, 7000, 72).ok).toBe(true);
    expect(pageRenderSize(7200, 7200, 72).ok).toBe(false);
  });
});

describe("renderTargets", () => {
  it("chooses all pages or the typed pages", () => {
    expect(renderTargets("all", "", 3)).toEqual({ ok: true, pages: [0, 1, 2] });
    expect(renderTargets("range", "2-3, 1", 5)).toEqual({ ok: true, pages: [0, 1, 2] });
  });

  it("passes on errors from the page list", () => {
    expect(renderTargets("range", "9", 5).ok).toBe(false);
    expect(renderTargets("range", "", 5).ok).toBe(false);
  });

  it("limits how many pages are converted at once", () => {
    expect(renderTargets("all", "", MAX_RENDER_PAGES).ok).toBe(true);
    const tooMany = renderTargets("all", "", MAX_RENDER_PAGES + 1);
    expect(tooMany.ok).toBe(false);
    if (!tooMany.ok) expect(tooMany.error).toContain(String(MAX_RENDER_PAGES));
    expect(renderTargets("range", `1-${MAX_RENDER_PAGES}`, 500).ok).toBe(true);
  });
});

describe("pageImageName", () => {
  it("numbers pages with enough digits to sort correctly", () => {
    const used = new Set<string>();
    expect(pageImageName("report", 2, 12, "jpg", used)).toBe("report-page-03.jpg");
    expect(pageImageName("report", 11, 12, "jpg", used)).toBe("report-page-12.jpg");
    expect(pageImageName("scan", 0, 5, "png", new Set())).toBe("scan-page-1.png");
    expect(pageImageName("big", 7, 100, "png", new Set())).toBe("big-page-008.png");
  });

  it("makes unsafe names safe and avoids repeats", () => {
    const used = new Set<string>();
    expect(pageImageName("a/b:c", 0, 2, "jpg", used)).toBe("a_b_c-page-1.jpg");
    expect(pageImageName("a/b:c", 0, 2, "jpg", used)).toBe("a_b_c-page-1-2.jpg");
  });
});