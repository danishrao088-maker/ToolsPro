import { describe, expect, it } from "vitest";
import { MAX_OUTPUT_SIDE, MAX_SVG_BYTES, prepareSvg, svgOutputSize } from "./svgSize";

function prepared(text: string) {
  const result = prepareSvg(text);
  if (!result.ok) throw new Error(`Expected success but got: ${result.error}`);
  return result;
}

describe("prepareSvg", () => {
  it("reads width and height and leaves the text alone", () => {
    const text = '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="50"><rect/></svg>';
    expect(prepared(text)).toEqual({ ok: true, text, width: 100, height: 50 });
  });

  it("converts length units to pixels", () => {
    const result = prepared('<svg width="2in" height="1in"></svg>');
    expect(result.width).toBeCloseTo(192, 5);
    expect(result.height).toBeCloseTo(96, 5);
    expect(prepared('<svg width="12pt" height="6pt"></svg>').width).toBeCloseTo(16, 5);
  });

  it("uses the viewBox when there is no size, and writes the size into the file", () => {
    const result = prepared('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 12"><path d="M0 0"/></svg>');
    expect([result.width, result.height]).toEqual([24, 12]);
    expect(result.text).toContain('xmlns="http://www.w3.org/2000/svg"');
    expect(result.text).toContain('width="24" height="12"');
    expect(result.text).toContain('<path d="M0 0"/></svg>');
  });

  it("works out the missing side from the viewBox", () => {
    expect(prepared('<svg width="200" viewBox="0 0 10 5"></svg>')).toMatchObject({ width: 200, height: 100 });
    expect(prepared('<svg height="40" viewBox="0 0 10 5"></svg>')).toMatchObject({ width: 80, height: 40 });
  });

  it("ignores percentages and replaces them", () => {
    const result = prepared('<svg width="100%" height="100%" viewBox="0 0 30 30"></svg>');
    expect([result.width, result.height]).toEqual([30, 30]);
    expect(result.text).not.toContain("100%");
    expect(result.text).toContain('width="30" height="30"');
  });

  it("does not mistake stroke-width for width", () => {
    const result = prepared('<svg viewBox="0 0 10 10" stroke-width="3"></svg>');
    expect([result.width, result.height]).toEqual([10, 10]);
    expect(result.text).toContain('stroke-width="3"');
  });

  it("handles single quotes, a self-closing root and a > inside an attribute", () => {
    expect(prepared("<svg width='5' height='7'/>")).toMatchObject({ width: 5, height: 7 });
    expect(prepared('<svg width="10" height="10" data-x="a>b"></svg>')).toMatchObject({ width: 10, height: 10 });
    const rewritten = prepared("<svg viewBox='0 0 4 4'/>");
    expect(rewritten.text).toBe('<svg viewBox=\'0 0 4 4\' width="4" height="4"/>');
  });

  it("skips a BOM, an XML declaration and comments", () => {
    const text = '\uFEFF<?xml version="1.0"?>\n<!-- logo -->\n<svg width="8" height="8"></svg>';
    expect(prepared(text)).toMatchObject({ width: 8, height: 8 });
  });

  it("ignores zero and negative sizes and falls back to the viewBox", () => {
    expect(prepared('<svg width="0" height="-5" viewBox="0 0 6 3"></svg>')).toMatchObject({ width: 6, height: 3 });
  });

  it("keeps dollar signs in the file intact", () => {
    const result = prepared('<svg viewBox="0 0 2 2"><text>$& $1 $$</text></svg>');
    expect(result.text).toContain("<text>$& $1 $$</text>");
  });

  it("rejects files that are not SVG, have no size, or are too large", () => {
    expect(prepareSvg("hello").ok).toBe(false);
    expect(prepareSvg("<html><body></body></html>").ok).toBe(false);
    const noSize = prepareSvg("<svg></svg>");
    expect(noSize.ok).toBe(false);
    expect(prepareSvg(`<svg width="1" height="1">${"a".repeat(MAX_SVG_BYTES)}</svg>`).ok).toBe(false);
  });
});

describe("svgOutputSize", () => {
  const natural = { width: 100, height: 50 };

  it("keeps the natural size or scales to a width", () => {
    expect(svgOutputSize(natural, null)).toEqual({ ok: true, width: 100, height: 50 });
    expect(svgOutputSize(natural, 400)).toEqual({ ok: true, width: 400, height: 200 });
    expect(svgOutputSize({ width: 3, height: 2 }, 100)).toEqual({ ok: true, width: 100, height: 67 });
  });

  it("never returns a side smaller than 1 pixel", () => {
    expect(svgOutputSize({ width: 0.2, height: 0.1 }, null)).toEqual({ ok: true, width: 1, height: 1 });
    expect(svgOutputSize({ width: 1000, height: 1 }, 100)).toEqual({ ok: true, width: 100, height: 1 });
  });

  it("rejects a result that is too big", () => {
    expect(svgOutputSize(natural, MAX_OUTPUT_SIDE + 1).ok).toBe(false);
    expect(svgOutputSize({ width: 1, height: 100 }, 1000).ok).toBe(false); // oonchai 100000
    expect(svgOutputSize({ width: 8000, height: 8000 }, null).ok).toBe(false); // 64 million pixels
    expect(svgOutputSize({ width: 7000, height: 7000 }, null).ok).toBe(true);
  });
});