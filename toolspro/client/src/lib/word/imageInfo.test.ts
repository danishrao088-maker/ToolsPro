import { describe, expect, it } from "vitest";
import { readImageInfo } from "./imageInfo";

function png(width: number, height: number): Uint8Array {
  const bytes = new Uint8Array(33);
  bytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52]);
  const view = new DataView(bytes.buffer);
  view.setUint32(16, width);
  view.setUint32(20, height);
  return bytes;
}

// Chhoti si JPEG: SOI, (chahe to Exif), SOF0, SOS
function jpeg(width: number, height: number, options: { orientation?: number; big?: boolean; components?: number } = {}): Uint8Array {
  const parts: number[] = [0xff, 0xd8];
  if (options.orientation !== undefined) {
    const big = options.big ?? false;
    const u16 = (v: number) => (big ? [v >> 8, v & 255] : [v & 255, v >> 8]);
    const u32 = (v: number) => (big ? [0, 0, v >> 8, v & 255] : [v & 255, v >> 8, 0, 0]);
    const tiff = [...(big ? [0x4d, 0x4d] : [0x49, 0x49]), ...u16(42), ...u32(8), ...u16(1), ...u16(0x0112), ...u16(3), ...u32(1), ...u16(options.orientation), 0, 0, ...u32(0)];
    const body = [0x45, 0x78, 0x69, 0x66, 0, 0, ...tiff];
    parts.push(0xff, 0xe1, (body.length + 2) >> 8, (body.length + 2) & 255, ...body);
  }
  const comps = options.components ?? 3;
  parts.push(0xff, 0xc0, 0, 8 + comps * 3, 8, height >> 8, height & 255, width >> 8, width & 255, comps);
  for (let i = 0; i < comps; i += 1) parts.push(i + 1, 0x11, 0);
  parts.push(0xff, 0xda, 0, 2);
  return new Uint8Array(parts);
}

describe("readImageInfo", () => {
  it("reads PNG size", () => {
    expect(readImageInfo(png(640, 480))).toEqual({ kind: "png", width: 640, height: 480, orientation: 1, components: 0 });
  });

  it("reads JPEG size and has orientation 1 without Exif", () => {
    expect(readImageInfo(jpeg(4000, 3000))).toEqual({ kind: "jpeg", width: 4000, height: 3000, orientation: 1, components: 3 });
  });

  it("reads Exif orientation in both byte orders", () => {
    expect(readImageInfo(jpeg(10, 20, { orientation: 6 }))?.orientation).toBe(6);
    expect(readImageInfo(jpeg(10, 20, { orientation: 8, big: true }))?.orientation).toBe(8);
    expect(readImageInfo(jpeg(10, 20, { orientation: 99 }))?.orientation).toBe(1);
  });

  it("reports the number of colour channels", () => {
    expect(readImageInfo(jpeg(10, 10, { components: 4 }))?.components).toBe(4);
    expect(readImageInfo(jpeg(10, 10, { components: 1 }))?.components).toBe(1);
  });

  it("returns undefined for other or broken data", () => {
    expect(readImageInfo(new Uint8Array([1, 2, 3]))).toBeUndefined();
    expect(readImageInfo(new Uint8Array([0xff, 0xd8, 0xff]))).toBeUndefined();
    expect(readImageInfo(new TextEncoder().encode("GIF89a......................."))).toBeUndefined();
    expect(readImageInfo(png(0, 5))).toBeUndefined();
    expect(readImageInfo(jpeg(10, 10).slice(0, 8))).toBeUndefined();
  });
});