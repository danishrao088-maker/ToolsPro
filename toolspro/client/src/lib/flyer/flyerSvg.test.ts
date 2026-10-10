import { describe, expect, it } from "vitest";
import { DEFAULT_FLYER, FLYER_LIMITS, buildFlyerSvg, flyerHeight, type FlyerOptions } from "./flyerSvg";

// Har huroof size x 0.5 chaura
const measure = (text: string, size: number) => Array.from(text).length * size * 0.5;
const base: FlyerOptions = {
  ...DEFAULT_FLYER,
  headline: "Summer Music Night",
  subtitle: "Live bands and food",
  body: "Join us for an evening of music.",
  details: "Saturday, 12 July\nCity Park\n\nEntry is free",
  cta: "Join us",
};

function build(changes: Partial<FlyerOptions> = {}) {
  const result = buildFlyerSvg({ ...base, ...changes }, measure);
  if (!result.ok) throw new Error(result.error);
  return result;
}

describe("flyerHeight", () => {
  it("keeps the shape of the paper", () => {
    expect(flyerHeight("a4")).toBe(849);
    expect(flyerHeight("letter")).toBe(776);
  });
});

describe("buildFlyerSvg checks", () => {
  it("needs a headline, valid colour and limited lengths", () => {
    expect(buildFlyerSvg({ ...base, headline: "  " }, measure).ok).toBe(false);
    expect(buildFlyerSvg({ ...base, accent: "blue" }, measure).ok).toBe(false);
    expect(buildFlyerSvg({ ...base, headline: "x".repeat(FLYER_LIMITS.headline + 1) }, measure).ok).toBe(false);
    expect(buildFlyerSvg({ ...base, body: "x".repeat(FLYER_LIMITS.body + 1) }, measure).ok).toBe(false);
    expect(buildFlyerSvg({ ...base, cta: "x".repeat(FLYER_LIMITS.cta + 1) }, measure).ok).toBe(false);
  });
});

describe("buildFlyerSvg", () => {
  it("makes a page of the right size with all the text", () => {
    const r = build();
    expect([r.width, r.height]).toEqual([600, 849]);
    expect(r.overflow).toBe(false);
    for (const word of ["Summer Music Night", "Live bands and food", "Join us for an evening of music.", "Saturday, 12 July", "City Park", "Entry is free", "Join us"]) {
      expect(r.svg).toContain(`>${word}</text>`);
    }
    expect(build({ paper: "letter" }).height).toBe(776);
  });

  it("draws the template shapes", () => {
    expect(build({ template: "band" }).svg).toContain(`<rect width="600" height="`);
    expect(build({ template: "center" }).svg).toContain('stroke-width="6"');
    expect(build({ template: "side" }).svg).toContain('<rect width="84"');
  });

  it("uses bullets for left-aligned details and none when centered", () => {
    expect(build({ template: "band" }).svg.match(/<circle /g)).toHaveLength(3);
    expect(build({ template: "center" }).svg).not.toContain("<circle ");
  });

  it("skips empty optional parts", () => {
    const r = build({ subtitle: "", body: "", details: "", cta: "" });
    expect(r.svg.match(/<text /g)).toHaveLength(1);
    expect(r.svg).not.toContain('rx="26"');
  });

  it("puts the picture inside a clip", () => {
    const r = build({ imageDataUrl: "data:image/jpeg;base64,AAAA" });
    expect(r.svg).toContain('<clipPath id="photo">');
    expect(r.svg).toContain('clip-path="url(#photo)"');
    expect(r.svg).toContain('preserveAspectRatio="xMidYMid slice"');
    expect(build().svg).not.toContain("<image");
  });

  it("escapes text and picture data", () => {
    const r = build({ headline: `A&B <"x">`, imageDataUrl: `data:image/png;base64,"><script>` });
    expect(r.svg).toContain("A&amp;B &lt;&quot;x&quot;&gt;");
    expect(r.svg).not.toContain("<script>");
  });

  it("makes text readable on the colour: dark text on a light colour", () => {
    expect(build({ template: "band", accent: "#fde047" }).svg).toContain('fill="#111827" fill-opacity="0.9"');
    expect(build({ template: "band", accent: "#1d4ed8" }).svg).toContain('fill="#ffffff" fill-opacity="0.9"');
  });

  it("warns when the text is too long for one page", () => {
    const many = "line\n".repeat(100); // 500 huroof, 100 lines
    expect(build({ body: many, details: "a\nb\nc\nd\ne\nf" }).overflow).toBe(true);
    expect(build({ headline: "wordword ".repeat(9).trim() }).overflow).toBe(true);
  });
});