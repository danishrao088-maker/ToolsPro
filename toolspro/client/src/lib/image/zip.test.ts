import { describe, expect, it } from "vitest";
import { buildZip, buildZipCompressed, crc32 } from "./zip";

const text = (value: string) => new TextEncoder().encode(value);

// Chhota sa reader: ZIP ko wapas parh kar dekhta hai ke jo likha wahi mila
function readZip(zip: Uint8Array) {
  const view = new DataView(zip.buffer, zip.byteOffset, zip.byteLength);
  const end = zip.length - 22;
  expect(view.getUint32(end, true)).toBe(0x06054b50);
  const count = view.getUint16(end + 10, true);
  let pos = view.getUint32(end + 16, true);
  const files: { name: string; data: Uint8Array; crc: number }[] = [];

  for (let i = 0; i < count; i += 1) {
    expect(view.getUint32(pos, true)).toBe(0x02014b50);
    const crc = view.getUint32(pos + 16, true);
    const size = view.getUint32(pos + 24, true);
    const nameLength = view.getUint16(pos + 28, true);
    const localOffset = view.getUint32(pos + 42, true);
    const name = new TextDecoder().decode(zip.subarray(pos + 46, pos + 46 + nameLength));

    expect(view.getUint32(localOffset, true)).toBe(0x04034b50);
    const localNameLength = view.getUint16(localOffset + 26, true);
    const dataStart = localOffset + 30 + localNameLength;
    files.push({ name, data: zip.slice(dataStart, dataStart + size), crc });
    pos += 46 + nameLength;
  }
  return files;
}

describe("crc32", () => {
  it("matches known values", () => {
    expect(crc32(new Uint8Array(0))).toBe(0);
    expect(crc32(text("123456789"))).toBe(0xcbf43926);
    expect(crc32(text("The quick brown fox jumps over the lazy dog"))).toBe(0x414fa339);
  });
});

describe("buildZip", () => {
  it("can be read back with the same names, data and checksums", () => {
    const zip = buildZip([
      { name: "a.txt", data: text("hello") },
      { name: "folder-b.bin", data: new Uint8Array([0, 255, 128, 1]) },
      { name: "empty.txt", data: new Uint8Array(0) },
    ]);
    const files = readZip(zip);
    expect(files.map((f) => f.name)).toEqual(["a.txt", "folder-b.bin", "empty.txt"]);
    expect(new TextDecoder().decode(files[0]?.data)).toBe("hello");
    expect(Array.from(files[1]?.data ?? [])).toEqual([0, 255, 128, 1]);
    expect(files[2]?.data.length).toBe(0);
    for (const file of files) expect(file.crc).toBe(crc32(file.data));
  });

  it("keeps non-English file names", () => {
    const files = readZip(buildZip([{ name: "تصویر.png", data: text("x") }]));
    expect(files[0]?.name).toBe("تصویر.png");
  });

  it("uses the date it is given, and not before 1980", () => {
    const zip = buildZip([{ name: "a", data: text("x") }], new Date(2026, 9, 4, 13, 30, 10));
    const view = new DataView(zip.buffer);
    expect(view.getUint16(10, true)).toBe((13 << 11) | (30 << 5) | 5);
    expect(view.getUint16(12, true)).toBe(((2026 - 1980) << 9) | (10 << 5) | 4);
    const old = buildZip([{ name: "a", data: text("x") }], new Date(1970, 0, 1));
    expect(new DataView(old.buffer).getUint16(12, true) >> 9).toBe(0);
  });

  it("rejects an empty list, duplicate names and empty names", () => {
    expect(() => buildZip([])).toThrow(RangeError);
    expect(() => buildZip([{ name: "a", data: text("1") }, { name: "a", data: text("2") }])).toThrow(/Duplicate/);
    expect(() => buildZip([{ name: "", data: text("1") }])).toThrow(RangeError);
  });
});

// Deflate wali ZIP ko wapas parhna: browser/Node ka DecompressionStream istemal hota hai
async function inflateRaw(data: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([new Uint8Array(data)]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

async function readCompressedZip(zip: Uint8Array) {
  const view = new DataView(zip.buffer, zip.byteOffset, zip.byteLength);
  const end = zip.length - 22;
  const count = view.getUint16(end + 10, true);
  let pos = view.getUint32(end + 16, true);
  const files: { name: string; method: number; data: Uint8Array; crc: number }[] = [];

  for (let i = 0; i < count; i += 1) {
    const method = view.getUint16(pos + 10, true);
    const crc = view.getUint32(pos + 16, true);
    const packed = view.getUint32(pos + 20, true);
    const nameLength = view.getUint16(pos + 28, true);
    const localOffset = view.getUint32(pos + 42, true);
    const name = new TextDecoder().decode(zip.subarray(pos + 46, pos + 46 + nameLength));
    const dataStart = localOffset + 30 + view.getUint16(localOffset + 26, true);
    const payload = zip.slice(dataStart, dataStart + packed);
    files.push({ name, method, data: method === 8 ? await inflateRaw(payload) : payload, crc });
    pos += 46 + nameLength;
  }
  return files;
}

describe("buildZipCompressed", () => {
  it("compresses text that repeats and can be read back exactly", async () => {
    const big = text("hello world ".repeat(2000));
    const result = await buildZipCompressed([{ name: "a.txt", data: big }]);
    const files = await readCompressedZip(result.bytes);
    expect(files[0]?.method).toBe(8);
    expect(files[0]?.data).toEqual(big);
    expect(files[0]?.crc).toBe(crc32(big));
    expect(result.entries[0]?.size).toBe(big.length);
    expect(result.entries[0]?.packed).toBeLessThan(big.length / 10);
    expect(result.bytes.length).toBeLessThan(big.length / 5);
  });

  it("stores data that does not get smaller, and empty files", async () => {
    let seed = 12345;
    const noise = new Uint8Array(2000).map(() => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      return seed >>> 16;
    });
    const result = await buildZipCompressed([
      { name: "noise.bin", data: noise },
      { name: "empty.txt", data: new Uint8Array(0) },
    ]);
    const files = await readCompressedZip(result.bytes);
    expect(files.map((f) => f.method)).toEqual([0, 0]);
    expect(files[0]?.data).toEqual(noise);
    expect(files[1]?.data.length).toBe(0);
  });

  it("mixes compressed and stored files and keeps the order and names", async () => {
    const result = await buildZipCompressed([
      { name: "تصویر.txt", data: text("abc".repeat(500)) },
      { name: "b.bin", data: new Uint8Array([1, 2, 3]) },
    ]);
    const files = await readCompressedZip(result.bytes);
    expect(files.map((f) => f.name)).toEqual(["تصویر.txt", "b.bin"]);
    expect(files.map((f) => f.method)).toEqual([8, 0]);
    expect(new TextDecoder().decode(files[0]?.data)).toBe("abc".repeat(500));
  });

  it("rejects an empty list and duplicate names", async () => {
    await expect(buildZipCompressed([])).rejects.toThrow(RangeError);
    await expect(buildZipCompressed([{ name: "a", data: text("1") }, { name: "a", data: text("2") }])).rejects.toThrow(/Duplicate/);
  });
});