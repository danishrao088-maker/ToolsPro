import { describe, expect, it } from "vitest";
import { DEFAULT_POSTER, buildPosterSvg, fitHeadline, posterDims, posterViewBox, type PosterOptions } from "./posterSvg";

const measure = (text: string, size: number) => Array.from(text).length * size * 0.5;
const base: PosterOptions = { ...DEFAULT_POSTER, headline: "Book Fair 2025", subtitle: "Books for everyone", details: "Friday, 10 AM\nCity Hall" };

function build(changes: Partial<PosterOptions> = {}) {
  const r = buildPosterSvg({ ...base, ...changes }, measure);
  if (!r.ok) throw new Error(r.error);
  return r;
}

describe("sizes", () => {
  it("swaps the sides for landscape", () => {
    const portrait = posterDims("a4", "portrait");
    const landscape = posterDims("a4", "landscape");
    expect([landscape.pointsWide, landscape.pointsHigh]).toEqual([portrait.pointsHigh, portrait.pointsWide]);
    expect([landscape.inchesWide, landscape.inchesHigh]).toEqual([portrait.inchesHigh, portrait.inchesWide]);
  });

  it("keeps the short side of the drawing at 600", () => {
    expect(posterViewBox("a4", "portrait")).toEqual({ width: 600, height: 849 });
    expect(posterViewBox("a4", "landscape")).toEqual({ width: 849, height: 600 });
    expect(posterViewBox("tabloid", "portrait")).toEqual({ width: 600, height: 927 });
    expect(Math.abs(posterViewBox("a3", "portrait").height - 849)).toBeLessThanOrEqual(1);
  });
});

describe("fitHeadline", () => {
  const stack = "x";
  it("uses the biggest size that fits in the box", () => {
    const fit = fitHeadline("Hi", 500, 200, measure, stack);
    expect(fit.fits).toBe(true);
    expect(fit.size).toBe(140);
    expect(fit.lines).toEqual(["Hi"]);
  });

  it("makes the font smaller and wraps for a long headline", () => {
    const fit = fitHeadline("Grand Annual Book Fair Open To All", 500, 300, measure, stack);
    expect(fit.fits).toBe(true);
    expect(fit.size).toBeLessThan(140);
    expect(fit.lines.length).toBeGreaterThan(1);
    expect(fit.lines.length * fit.size * 1.1).toBeLessThanOrEqual(300);
    expect(fit.lines.join(" ")).toBe("Grand Annual Book Fair Open To All");
  });

  it("never breaks a word in the middle", () => {
    const fit = fitHeadline("Extraordinary", 200, 400, measure, stack);
    expect(fit.lines).toEqual(["Extraordinary"]);
    expect(fit.size * 13 * 0.5).toBeLessThanOrEqual(200);
  });

  it("reports when nothing fits", () => {
    const fit = fitHeadline("Supercalifragilisticexpialidocious", 100, 100, measure, stack);
    expect(fit.fits).toBe(false);
    expect(fit.size).toBe(28);
  });
});

describe("buildPosterSvg", () => {
  it("checks the input", () => {
    expect(buildPosterSvg({ ...base, headline: " " }, measure).ok).toBe(false);
    expect(buildPosterSvg({ ...base, accent: "red" }, measure).ok).toBe(false);
    expect(buildPosterSvg({ ...base, headline: "x".repeat(61) }, measure).ok).toBe(false);
    expect(buildPosterSvg({ ...base, details: "x".repeat(301) }, measure).ok).toBe(false);
  });

  it("puts all the text on every design", () => {
    for (const template of ["bold", "photo", "split"] as const) {
      const r = build({ template });
      expect(r.overflow).toBe(false);
      for (const w of ["Book", "Fair", "2025"]) expect(r.svg).toContain(w);
      for (const t of ["Books for everyone", "Friday, 10 AM", "City Hall"]) expect(r.svg).toContain(`>${t}</text>`);
    }
  });

  it("makes the page the right size", () => {
    expect(build({ orientation: "landscape" })).toMatchObject({ width: 849, height: 600 });
  });

  it("uses a picture when given, and the colour when not", () => {
    const withPhoto = build({ template: "photo", imageDataUrl: "data:image/jpeg;base64,AAAA" });
    expect(withPhoto.svg).toContain("<image ");
    expect(withPhoto.svg).toContain("url(#fade)");
    expect(build({ template: "photo" }).svg).not.toContain("<image");
    expect(build({ template: "split", imageDataUrl: "data:image/jpeg;base64,AAAA" }).svg).toContain("<image ");
  });

  it("centres text for the bold design only", () => {
    expect(build({ template: "bold" }).svg).toContain('text-anchor="middle"');
    expect(build({ template: "photo" }).svg).not.toContain('text-anchor="middle"');
  });

  it("makes text readable on the colour", () => {
    expect(build({ template: "bold", accent: "#fde047" }).svg).toContain('fill="#111827"');
    expect(build({ template: "bold", accent: "#1d4ed8" }).svg).toContain('fill="#ffffff"');
  });

  it("escapes text", () => {
    expect(build({ headline: `A&B <"x">` }).svg).toContain("A&amp;B &lt;&quot;x&quot;&gt;");
  });

  it("warns when the headline cannot fit", () => {
    expect(build({ headline: "x".repeat(55) }).overflow).toBe(true);
  });
});