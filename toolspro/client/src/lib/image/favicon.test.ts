import { describe, expect, it } from "vitest";
import { APPLE_SIZE, HEAD_SNIPPET, ICON_SIZES, ICO_SIZES, PNG_FILES, iconPlacement, validateIconSource } from "./favicon";
import { MAX_SVG_BYTES } from "./svgSize";

describe("iconPlacement", () => {
  it("fits a wide picture inside the square", () => {
    expect(iconPlacement(200, 100, 100, "fit")).toEqual({ x: 0, y: 25, width: 100, height: 50 });
  });

  it("fills the square and crops a wide picture", () => {
    expect(iconPlacement(200, 100, 100, "fill")).toEqual({ x: -50, y: 0, width: 200, height: 100 });
  });

  it("scales up small pictures and keeps squares exact", () => {
    expect(iconPlacement(10, 10, 100, "fit")).toEqual({ x: 0, y: 0, width: 100, height: 100 });
    expect(iconPlacement(100, 100, 32, "fill")).toEqual({ x: 0, y: 0, width: 32, height: 32 });
  });
});

describe("favicon file list", () => {
  it("only asks for sizes that are rendered", () => {
    for (const size of ICO_SIZES) expect(ICON_SIZES).toContain(size);
    for (const file of PNG_FILES) expect(ICON_SIZES).toContain(file.size);
    expect(new Set(ICON_SIZES).size).toBe(ICON_SIZES.length);
    expect(PNG_FILES.find((file) => file.name === "apple-touch-icon.png")?.size).toBe(APPLE_SIZE);
  });

  it("uses file names that match the head snippet", () => {
    const names = PNG_FILES.map((file) => file.name);
    for (const file of ["favicon-16x16.png", "favicon-32x32.png", "apple-touch-icon.png"]) {
      expect(names).toContain(file);
      expect(HEAD_SNIPPET).toContain(`/${file}`);
    }
    expect(HEAD_SNIPPET).toContain("/favicon.ico");
  });
});

describe("validateIconSource", () => {
  it("accepts SVG and the usual image types", () => {
    expect(validateIconSource({ name: "logo.svg", type: "image/svg+xml", size: 1000 }).ok).toBe(true);
    expect(validateIconSource({ name: "logo.SVG", type: "", size: 1000 }).ok).toBe(true);
    expect(validateIconSource({ name: "logo.png", type: "image/png", size: 1000 }).ok).toBe(true);
  });

  it("rejects other files, empty files and large SVGs", () => {
    expect(validateIconSource({ name: "a.pdf", type: "application/pdf", size: 1000 }).ok).toBe(false);
    expect(validateIconSource({ name: "a.svg", type: "image/svg+xml", size: 0 }).ok).toBe(false);
    expect(validateIconSource({ name: "a.svg", type: "image/svg+xml", size: MAX_SVG_BYTES + 1 }).ok).toBe(false);
  });
});