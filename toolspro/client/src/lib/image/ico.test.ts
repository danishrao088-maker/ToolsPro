import { describe, expect, it } from "vitest";
import { buildIco } from "./ico";

describe("buildIco", () => {
  const a = new Uint8Array([1, 2, 3]);
  const b = new Uint8Array([9, 8, 7, 6, 5]);

  it("writes the header, one record per image, then the image data", () => {
    const ico = buildIco([
      { size: 16, data: a },
      { size: 32, data: b },
    ]);
    const view = new DataView(ico.buffer);
    expect(Array.from(ico.subarray(0, 6))).toEqual([0, 0, 1, 0, 2, 0]);

    // pehla record
    expect(ico[6]).toBe(16);
    expect(ico[7]).toBe(16);
    expect(view.getUint16(10, true)).toBe(1); // planes
    expect(view.getUint16(12, true)).toBe(32); // bits per pixel
    expect(view.getUint32(14, true)).toBe(3); // data ki lambai
    expect(view.getUint32(18, true)).toBe(38); // 6 + 2 * 16

    // doosra record
    expect(ico[22]).toBe(32);
    expect(view.getUint32(30, true)).toBe(5);
    expect(view.getUint32(34, true)).toBe(41);

    expect(Array.from(ico.subarray(38, 41))).toEqual([1, 2, 3]);
    expect(Array.from(ico.subarray(41))).toEqual([9, 8, 7, 6, 5]);
    expect(ico.length).toBe(46);
  });

  it("stores 256 as 0", () => {
    const ico = buildIco([{ size: 256, data: a }]);
    expect(ico[6]).toBe(0);
    expect(ico[7]).toBe(0);
  });

  it("rejects an empty list and invalid sizes", () => {
    expect(() => buildIco([])).toThrow(RangeError);
    for (const size of [0, 257, 1.5, -1]) {
      expect(() => buildIco([{ size, data: a }]), String(size)).toThrow(RangeError);
    }
  });
});