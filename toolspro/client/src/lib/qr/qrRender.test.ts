import { describe, expect, it } from "vitest";
import { colorWarning, contrastRatio, isHexColor } from "./qrColor";
import { encodeQr, isDark, type QrCode } from "./qrEncoder";
import { MAX_PNG_SIDE, qrPixelSize, qrToSvg } from "./qrRender";

function make(text: string): QrCode {
  const result = encodeQr(text, "M");
  if (!result.ok) throw new Error(result.error);
  return result.qr;
}

// SVG ke path ko wapas module grid mein badalta hai
function pathToGrid(svg: string, total: number): boolean[][] {
  const grid = Array.from({ length: total }, () => new Array<boolean>(total).fill(false));
  const match = /<path d="([^"]*)"/.exec(svg);
  for (const part of (match?.[1] ?? "").split("z")) {
    const m = /^M(\d+) (\d+)h(\d+)v1h-\d+$/.exec(part);
    if (!m) continue;
    const [x, y, w] = [Number(m[1]), Number(m[2]), Number(m[3])];
    for (let i = 0; i < w; i += 1) {
      const row = grid[y];
      if (row) row[x + i] = true;
    }
  }
  return grid;
}

describe("qrToSvg", () => {
  it("draws exactly the dark modules, shifted by the margin", () => {
    const qr = make("svg check");
    const margin = 4;
    const svg = qrToSvg(qr, { margin, foreground: "#000000", background: "#ffffff" });
    const grid = pathToGrid(svg, qr.size + margin * 2);
    for (let y = 0; y < qr.size + margin * 2; y += 1) {
      for (let x = 0; x < qr.size + margin * 2; x += 1) {
        const inside = x >= margin && y >= margin && x < qr.size + margin && y < qr.size + margin;
        expect(grid[y]?.[x], `${x},${y}`).toBe(inside ? isDark(qr, x - margin, y - margin) : false);
      }
    }
  });

  it("sets the viewBox, colours and the background", () => {
    const qr = make("colours");
    const svg = qrToSvg(qr, { margin: 2, foreground: "#112233", background: "#ffeedd" });
    const total = qr.size + 4;
    expect(svg).toContain(`viewBox="0 0 ${total} ${total}"`);
    expect(svg).toContain('fill="#112233"');
    expect(svg).toContain('<rect width="' + total + '" height="' + total + '" fill="#ffeedd"/>');
    expect(svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg"')).toBe(true);
  });

  it("leaves out the background rectangle when transparent", () => {
    expect(qrToSvg(make("x"), { margin: 0, foreground: "#000000", background: null })).not.toContain("<rect");
  });

  it("rejects unsafe colours and bad margins", () => {
    const qr = make("x");
    expect(() => qrToSvg(qr, { margin: 4, foreground: 'red" onload="x', background: null })).toThrow(RangeError);
    expect(() => qrToSvg(qr, { margin: 4, foreground: "#000000", background: "#fff" })).toThrow(RangeError);
    expect(() => qrToSvg(qr, { margin: -1, foreground: "#000000", background: null })).toThrow(RangeError);
    expect(() => qrToSvg(qr, { margin: 11, foreground: "#000000", background: null })).toThrow(RangeError);
    expect(() => qrToSvg(qr, { margin: 1.5, foreground: "#000000", background: null })).toThrow(RangeError);
  });
});

describe("qrPixelSize", () => {
  it("uses a whole number of pixels per module", () => {
    expect(qrPixelSize(25, 4, 512)).toEqual({ scale: 15, pixels: 15 * 33 }); // 495
    expect(qrPixelSize(21, 4, 29)).toEqual({ scale: 1, pixels: 29 });
  });

  it("never goes below 1 pixel per module or above the limit", () => {
    expect(qrPixelSize(177, 4, 100)).toEqual({ scale: 1, pixels: 185 });
    const big = qrPixelSize(25, 4, 100000);
    expect(big.pixels).toBeLessThanOrEqual(MAX_PNG_SIDE);
    expect(big.pixels % 33).toBe(0);
  });
});

describe("colours", () => {
  it("accepts only 6-digit hex colours", () => {
    expect(isHexColor("#a1B2c3")).toBe(true);
    for (const bad of ["#fff", "a1b2c3", "#12345g", "red", "", "#1234567"]) expect(isHexColor(bad), bad).toBe(false);
  });

  it("computes contrast", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 5);
    expect(contrastRatio("#777777", "#777777")).toBeCloseTo(1, 5);
    expect(contrastRatio("#ffffff", "#000000")).toBeCloseTo(21, 5);
  });

  it("warns about inverted and low-contrast codes only", () => {
    expect(colorWarning("#000000", "#ffffff")).toBe("");
    expect(colorWarning("#1e3a8a", "#ffffff")).toBe("");
    expect(colorWarning("#ffffff", "#000000")).toContain("lighter");
    expect(colorWarning("#888888", "#999999")).toContain("too close");
    expect(colorWarning("nope", "#ffffff")).toBe("");
  });
});