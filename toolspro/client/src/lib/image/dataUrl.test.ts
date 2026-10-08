import { describe, expect, it } from "vitest";
import { bytesToDataUrl, svgToDataUrl } from "./dataUrl";

describe("bytesToDataUrl", () => {
  it("encodes bytes as base64", () => {
    expect(bytesToDataUrl(new Uint8Array([72, 105]), "text/plain")).toBe("data:text/plain;base64,SGk=");
    expect(bytesToDataUrl(new Uint8Array(0), "image/png")).toBe("data:image/png;base64,");
  });

  it("handles large arrays without hitting the argument limit", () => {
    const big = new Uint8Array(300_000).fill(65);
    const url = bytesToDataUrl(big, "image/png");
    expect(atob(url.split(",")[1] ?? "")).toBe("A".repeat(300_000));
  });
});

describe("svgToDataUrl", () => {
  it("encodes the text so it survives a round trip", () => {
    const text = '<svg width="1" height="1"><text>"a" & <b></text></svg>';
    const url = svgToDataUrl(text);
    expect(url.startsWith("data:image/svg+xml;charset=utf-8,")).toBe(true);
    expect(decodeURIComponent(url.slice(url.indexOf(",") + 1))).toBe(text);
    expect(url).not.toContain("<");
  });
});