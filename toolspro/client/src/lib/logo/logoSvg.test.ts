import { describe, expect, it } from "vitest";
import { DEFAULT_LOGO, LOGO_ICONS, buildLogoSvg, initialsOf, type LogoOptions, type MeasureText } from "./logoSvg";

// Har huroof 0.5 x font size: naapna aasaan aur pakka
const measure: MeasureText = (text, size) => Array.from(text).length * size * 0.5;
const base: LogoOptions = { ...DEFAULT_LOGO, name: "Blue Sky" };

function build(changes: Partial<LogoOptions> = {}) {
  const result = buildLogoSvg({ ...base, ...changes }, measure);
  if (!result.ok) throw new Error(result.error);
  return result;
}

describe("initialsOf", () => {
  it("takes the first letters of up to two words", () => {
    expect(initialsOf("Blue Sky Studio")).toBe("BS");
    expect(initialsOf("  acme ")).toBe("A");
    expect(initialsOf("")).toBe("");
    expect(initialsOf("علی احمد")).toBe("عا");
  });
});

describe("buildLogoSvg checks", () => {
  it("needs a name and valid colors", () => {
    expect(buildLogoSvg({ ...base, name: "  " }, measure).ok).toBe(false);
    expect(buildLogoSvg({ ...base, iconColor: "blue" }, measure).ok).toBe(false);
    expect(buildLogoSvg({ ...base, background: "red" }, measure).ok).toBe(false);
    expect(buildLogoSvg({ ...base, name: "x".repeat(41) }, measure).ok).toBe(false);
    expect(buildLogoSvg({ ...base, tagline: "x".repeat(61) }, measure).ok).toBe(false);
  });
});

describe("buildLogoSvg layouts", () => {
  it("makes a stacked logo as wide as the name plus padding", () => {
    const r = build();
    // "Blue Sky" = 8 x 32 = 256 wide, bada hai symbol (100) se
    expect(r.width).toBe(256 + 80);
    expect(r.height).toBe(Math.ceil(80 + 100 + 24 + 64 * 1.15));
    expect(r.svg).toContain(`viewBox="0 0 ${r.width} ${r.height}"`);
    expect(r.svg.startsWith("<svg")).toBe(true);
  });

  it("places the symbol beside the name", () => {
    const r = build({ layout: "side" });
    expect(r.width).toBe(80 + 100 + 24 + 256);
    expect(r.height).toBe(80 + 100);
  });

  it("has no symbol in name-only mode", () => {
    const r = build({ layout: "text" });
    expect(r.svg).not.toContain("<polygon");
    expect(r.width).toBe(256 + 80);
    expect(r.height).toBe(Math.ceil(80 + 64 * 1.15));
  });

  it("grows for a longer tagline and adds it to the height", () => {
    const without = build();
    const withTag = build({ tagline: "Design and print" });
    expect(withTag.height).toBeGreaterThan(without.height);
    expect(withTag.svg).toContain("Design and print");
    expect(withTag.svg).toContain('fill-opacity="0.75"');
  });
});

describe("buildLogoSvg content", () => {
  it("draws every symbol shape", () => {
    for (const icon of LOGO_ICONS) {
      const svg = build({ icon: icon.value }).svg;
      expect(svg).toMatch(/<(circle|rect|polygon|path) /);
    }
    expect(build({ icon: "star" }).svg).toContain('points="50.00,2.00');
  });

  it("puts initials in the symbol with a readable colour", () => {
    expect(build({ iconColor: "#1d4ed8" }).svg).toContain('fill="#ffffff">BS</text>');
    expect(build({ iconColor: "#fde047" }).svg).toContain('fill="#111827">BS</text>');
    expect(build({ initials: false }).svg).not.toContain(">BS<");
  });

  it("escapes the name and keeps the background optional", () => {
    const r = build({ name: `A&B <"x">`, background: "#ffffff" });
    expect(r.svg).toContain("A&amp;B &lt;&quot;x&quot;&gt;");
    expect(r.svg).toContain('<rect width="');
    expect(build().svg).not.toContain('<rect width=');
  });

  it("uses font stacks that stay valid inside the attribute", () => {
    const svg = build({ font: "serif" }).svg;
    expect(svg).toContain(`font-family="Georgia, 'Times New Roman', serif"`);
    expect(build({ bold: false }).svg).toContain('font-weight="400"');
  });
});