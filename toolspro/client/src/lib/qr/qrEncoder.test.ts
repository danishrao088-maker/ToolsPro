import { describe, expect, it } from "vitest";
import { MAX_BYTES, byteCapacity, dataCodewords, encodeQr, isDark, type EccLevel, type QrCode } from "./qrEncoder";

function make(text: string, ecc: EccLevel = "M"): QrCode {
  const result = encodeQr(text, ecc);
  if (!result.ok) throw new Error(`Expected success but got: ${result.error}`);
  return result.qr;
}

// Qr ke andar se format bits wapas parhta hai (pehli copy)
function readFormat(qr: QrCode): number {
  const bit = (x: number, y: number) => (isDark(qr, x, y) ? 1 : 0);
  let bits = 0;
  for (let i = 0; i <= 5; i += 1) bits |= bit(8, i) << i;
  bits |= bit(8, 7) << 6;
  bits |= bit(8, 8) << 7;
  bits |= bit(7, 8) << 8;
  for (let i = 9; i < 15; i += 1) bits |= bit(14 - i, 8) << i;
  return bits;
}

function readFormatSecondCopy(qr: QrCode): number {
  const bit = (x: number, y: number) => (isDark(qr, x, y) ? 1 : 0);
  let bits = 0;
  for (let i = 0; i < 8; i += 1) bits |= bit(qr.size - 1 - i, 8) << i;
  for (let i = 8; i < 15; i += 1) bits |= bit(8, qr.size - 15 + i) << i;
  return bits;
}

describe("capacity tables", () => {
  // Ye qeematein QR standard ki mashhoor jadwal se hain (byte mode)
  const known: [EccLevel, number[]][] = [
    ["L", [17, 32, 53, 78, 106, 134, 154, 192, 230, 271]],
    ["M", [14, 26, 42, 62, 84, 106, 122, 152, 180, 213]],
    ["Q", [11, 20, 32, 46, 60, 74, 86, 108, 130, 151]],
    ["H", [7, 14, 24, 34, 44, 58, 64, 84, 98, 119]],
  ];

  it("matches the published byte capacities for versions 1 to 10", () => {
    for (const [ecc, values] of known) {
      values.forEach((value, index) => expect(byteCapacity(index + 1, ecc), `${ecc} v${index + 1}`).toBe(value));
    }
  });

  it("matches the published capacities of version 40", () => {
    expect(byteCapacity(40, "L")).toBe(2953);
    expect(byteCapacity(40, "M")).toBe(2331);
    expect(byteCapacity(40, "Q")).toBe(1663);
    expect(byteCapacity(40, "H")).toBe(1273);
  });

  it("matches the published data codeword counts", () => {
    expect(dataCodewords(1, "L")).toBe(19);
    expect(dataCodewords(1, "H")).toBe(9);
    expect(dataCodewords(40, "L")).toBe(2956);
    expect(dataCodewords(40, "H")).toBe(1276);
  });

  it("never gets smaller as the version grows", () => {
    for (const ecc of ["L", "M", "Q", "H"] as EccLevel[]) {
      for (let version = 2; version <= 40; version += 1) {
        expect(byteCapacity(version, ecc)).toBeGreaterThan(byteCapacity(version - 1, ecc));
      }
    }
  });
});

describe("encodeQr", () => {
  it("picks the smallest version that fits", () => {
    expect(make("a".repeat(17), "L").version).toBe(1);
    expect(make("a".repeat(18), "L").version).toBe(2);
    expect(make("a".repeat(14), "M").version).toBe(1);
    expect(make("a".repeat(15), "M").version).toBe(2);
    expect(make("a".repeat(271), "L").version).toBe(10);
    expect(make("a".repeat(272), "L").version).toBe(11);
  });

  it("uses a larger version for a higher error correction level", () => {
    const text = "https://example.com/some/page";
    expect(make(text, "H").version).toBeGreaterThan(make(text, "L").version);
  });

  it("makes a square of 17 + 4 * version modules", () => {
    const qr = make("hello");
    expect(qr.size).toBe(17 + 4 * qr.version);
    expect(qr.modules.length).toBe(qr.size * qr.size);
  });

  it("is repeatable", () => {
    expect(Array.from(make("same text").modules)).toEqual(Array.from(make("same text").modules));
  });

  it("changes when the text changes", () => {
    expect(Array.from(make("text one").modules)).not.toEqual(Array.from(make("text two").modules));
  });

  it("draws the three finder patterns and the always-dark module", () => {
    const qr = make("finder");
    const last = qr.size - 7;
    for (const [ox, oy] of [[0, 0], [last, 0], [0, last]] as const) {
      for (let y = 0; y < 7; y += 1) {
        for (let x = 0; x < 7; x += 1) {
          const edge = x === 0 || x === 6 || y === 0 || y === 6;
          const core = x >= 2 && x <= 4 && y >= 2 && y <= 4;
          expect(isDark(qr, ox + x, oy + y), `${ox},${oy} ${x},${y}`).toBe(edge || core);
        }
      }
    }
    expect(isDark(qr, 8, qr.size - 8)).toBe(true);
  });

  it("draws the timing pattern", () => {
    const qr = make("timing text for a bigger version 123456");
    for (let i = 8; i < qr.size - 8; i += 1) {
      expect(isDark(qr, i, 6)).toBe(i % 2 === 0);
      expect(isDark(qr, 6, i)).toBe(i % 2 === 0);
    }
  });

  it("writes valid, matching format bits in both places", () => {
    for (const ecc of ["L", "M", "Q", "H"] as EccLevel[]) {
      const qr = make("format check", ecc);
      const first = readFormat(qr);
      expect(readFormatSecondCopy(qr)).toBe(first);

      const data = first ^ 0x5412;
      // Sahi BCH code ko generator 0x537 se taqseem karo to baqi 0 bachta hai
      let rem = data;
      for (let bitIndex = 14; bitIndex >= 10; bitIndex -= 1) {
        if ((rem >>> bitIndex) & 1) rem ^= 0x537 << (bitIndex - 10);
      }
      expect(rem).toBe(0);
      expect(data >>> 13).toBe({ L: 1, M: 0, Q: 3, H: 2 }[ecc]);
      expect((data >>> 10) & 7).toBe(qr.mask);
    }
  });

  it("writes the version information for version 7 and larger", () => {
    const qr = make("a".repeat(160), "L"); // version 8
    expect(qr.version).toBeGreaterThanOrEqual(7);
    let bits = 0;
    for (let i = 0; i < 18; i += 1) {
      const a = qr.size - 11 + (i % 3);
      const b = Math.floor(i / 3);
      const dark = isDark(qr, a, b);
      expect(isDark(qr, b, a)).toBe(dark);
      if (dark) bits |= 1 << i;
    }
    expect(bits >>> 12).toBe(qr.version);
  });

  it("handles non-English text as UTF-8", () => {
    const urdu = "یہ ایک ٹیسٹ ہے";
    const bytes = new TextEncoder().encode(urdu).length;
    const qr = make(urdu, "L");
    expect(byteCapacity(qr.version, "L")).toBeGreaterThanOrEqual(bytes);
    expect(byteCapacity(qr.version - 1 || 1, "L") < bytes || qr.version === 1).toBe(true);
  });

  it("rejects empty text and text that is too long", () => {
    const empty = encodeQr("", "M");
    expect(empty.ok).toBe(false);
    const long = encodeQr("a".repeat(MAX_BYTES + 1), "L");
    expect(long.ok).toBe(false);
    expect(encodeQr("a".repeat(MAX_BYTES), "L").ok).toBe(true);
  });

  it("accepts the largest allowed text at the highest level", () => {
    // 1000 bytes aur "H" level version 40 mein bhi aa jata hai (1273), is liye ye hamesha ok hai
    expect(encodeQr("a".repeat(MAX_BYTES), "H").ok).toBe(true);
  });
});