export type EccLevel = "L" | "M" | "Q" | "H";

export const ECC_LEVELS: { value: EccLevel; label: string }[] = [
  { value: "L", label: "Low (about 7% can be damaged)" },
  { value: "M", label: "Medium (about 15%)" },
  { value: "Q", label: "Quartile (about 25%)" },
  { value: "H", label: "High (about 30%)" },
];

export interface QrCode {
  version: number; // 1 se 40
  size: number; // har taraf modules ki tadaad (17 + 4 * version)
  ecc: EccLevel;
  mask: number;
  modules: Uint8Array; // size * size, 1 = gehra (dark) module
}

export type QrResult = { ok: true; qr: QrCode } | { ok: false; error: string };

export function isDark(qr: QrCode, x: number, y: number): boolean {
  return (qr.modules[y * qr.size + x] ?? 0) === 1;
}

// Hamari apni hadd: bohat lambe text se bohat ghana QR banta hai jo phone scan nahi kar paate
export const MAX_BYTES = 1000;

// Jadwal: har version (1..40) ke liye. Index 0 bharti ke liye hai. (ISO/IEC 18004 ke mutabiq)
const ECC_CODEWORDS_PER_BLOCK: Record<EccLevel, number[]> = {
  L: [-1, 7, 10, 15, 20, 26, 18, 20, 24, 30, 18, 20, 24, 26, 30, 22, 24, 28, 30, 28, 28, 28, 28, 30, 30, 26, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
  M: [-1, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26, 30, 22, 22, 24, 24, 28, 28, 26, 26, 26, 26, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28],
  Q: [-1, 13, 22, 18, 26, 18, 24, 18, 22, 20, 24, 28, 26, 24, 20, 30, 24, 28, 28, 26, 30, 28, 30, 30, 30, 30, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
  H: [-1, 17, 28, 22, 16, 22, 28, 26, 26, 24, 28, 24, 28, 22, 24, 24, 30, 28, 28, 26, 28, 30, 24, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
};

const NUM_ERROR_CORRECTION_BLOCKS: Record<EccLevel, number[]> = {
  L: [-1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 4, 4, 4, 4, 4, 6, 6, 6, 6, 7, 8, 8, 9, 9, 10, 12, 12, 12, 13, 14, 15, 16, 17, 18, 19, 19, 20, 21, 22, 24, 25],
  M: [-1, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5, 5, 8, 9, 9, 10, 10, 11, 13, 14, 16, 17, 17, 18, 20, 21, 23, 25, 26, 28, 29, 31, 33, 35, 37, 38, 40, 43, 45, 47, 49],
  Q: [-1, 1, 1, 2, 2, 4, 4, 6, 6, 8, 8, 8, 10, 12, 16, 12, 17, 16, 18, 21, 20, 23, 23, 25, 27, 29, 34, 34, 35, 38, 40, 43, 45, 48, 51, 53, 56, 59, 62, 65, 68],
  H: [-1, 1, 1, 2, 4, 4, 4, 5, 6, 8, 8, 11, 11, 16, 16, 18, 16, 19, 21, 25, 25, 25, 34, 30, 32, 35, 37, 40, 42, 45, 48, 51, 54, 57, 60, 63, 66, 70, 74, 77, 81],
};

// Format bits mein ECC level ka code (L=1, M=0, Q=3, H=2)
const FORMAT_BITS: Record<EccLevel, number> = { L: 1, M: 0, Q: 3, H: 2 };

const table = (values: Record<EccLevel, number[]>, ecc: EccLevel, version: number): number => values[ecc][version] ?? 0;

// Version mein kul kitne modules data/ECC ke liye hain (finder, timing waghaira ke baghair)
function rawDataModules(version: number): number {
  let result = (16 * version + 128) * version + 64;
  if (version >= 2) {
    const aligns = Math.floor(version / 7) + 2;
    result -= (25 * aligns - 10) * aligns - 55;
    if (version >= 7) result -= 36;
  }
  return result;
}

// Is version aur ECC level par kitne data codewords (bytes) aate hain
export function dataCodewords(version: number, ecc: EccLevel): number {
  return (
    Math.floor(rawDataModules(version) / 8) -
    table(ECC_CODEWORDS_PER_BLOCK, ecc, version) * table(NUM_ERROR_CORRECTION_BLOCKS, ecc, version)
  );
}

// Byte mode mein is version par kitne bytes ka text aa sakta hai
export function byteCapacity(version: number, ecc: EccLevel): number {
  const countBits = version <= 9 ? 8 : 16;
  return Math.min(Math.floor((dataCodewords(version, ecc) * 8 - 4 - countBits) / 8), version <= 9 ? 255 : 65535);
}

// Reed-Solomon: GF(256) mein guna (polynomial 0x11D)
function gfMultiply(x: number, y: number): number {
  let z = 0;
  for (let i = 7; i >= 0; i -= 1) {
    z = (z << 1) ^ ((z >>> 7) * 0x11d);
    z ^= ((y >>> i) & 1) * x;
  }
  return z;
}

function rsDivisor(degree: number): number[] {
  const result = new Array<number>(degree).fill(0);
  result[degree - 1] = 1;
  let root = 1;
  for (let i = 0; i < degree; i += 1) {
    for (let j = 0; j < degree; j += 1) {
      result[j] = gfMultiply(result[j] ?? 0, root);
      if (j + 1 < degree) result[j] = (result[j] ?? 0) ^ (result[j + 1] ?? 0);
    }
    root = gfMultiply(root, 0x02);
  }
  return result;
}

function rsRemainder(data: number[], divisor: number[]): number[] {
  const result = new Array<number>(divisor.length).fill(0);
  for (const byte of data) {
    const factor = byte ^ (result.shift() ?? 0);
    result.push(0);
    divisor.forEach((coef, i) => {
      result[i] = (result[i] ?? 0) ^ gfMultiply(coef, factor);
    });
  }
  return result;
}

function addEccAndInterleave(data: number[], version: number, ecc: EccLevel): number[] {
  const blocks = table(NUM_ERROR_CORRECTION_BLOCKS, ecc, version);
  const blockEccLen = table(ECC_CODEWORDS_PER_BLOCK, ecc, version);
  const rawCodewords = Math.floor(rawDataModules(version) / 8);
  const shortBlocks = blocks - (rawCodewords % blocks);
  const shortBlockLen = Math.floor(rawCodewords / blocks);

  const divisor = rsDivisor(blockEccLen);
  const result: number[][] = [];
  let k = 0;
  for (let i = 0; i < blocks; i += 1) {
    const block = data.slice(k, k + shortBlockLen - blockEccLen + (i < shortBlocks ? 0 : 1));
    k += block.length;
    const eccBytes = rsRemainder(block, divisor);
    if (i < shortBlocks) block.push(0); // chhote block mein ek jagah khali, taake sab ki lambai barabar ho
    result.push(block.concat(eccBytes));
  }

  const out: number[] = [];
  for (let i = 0; i < (result[0]?.length ?? 0); i += 1) {
    result.forEach((block, j) => {
      if (i !== shortBlockLen - blockEccLen || j >= shortBlocks) out.push(block[i] ?? 0);
    });
  }
  return out;
}

function bit(value: number, index: number): boolean {
  return ((value >>> index) & 1) !== 0;
}

class Builder {
  readonly size: number;
  readonly modules: Uint8Array;
    readonly reserved: Uint8Array; // 1 = function pattern (data nahi)
  readonly version: number;
  readonly ecc: EccLevel;

  constructor(version: number, ecc: EccLevel) {
    this.version = version;
    this.ecc = ecc;
    this.size = version * 4 + 17;
    this.modules = new Uint8Array(this.size * this.size);
    this.reserved = new Uint8Array(this.size * this.size);
    this.drawFunctionPatterns();
  }

  private setFunction(x: number, y: number, dark: boolean): void {
    this.modules[y * this.size + x] = dark ? 1 : 0;
    this.reserved[y * this.size + x] = 1;
  }

  private drawFunctionPatterns(): void {
    const { size, version } = this;
    for (let i = 0; i < size; i += 1) {
      this.setFunction(6, i, i % 2 === 0);
      this.setFunction(i, 6, i % 2 === 0);
    }
    this.drawFinder(3, 3);
    this.drawFinder(size - 4, 3);
    this.drawFinder(3, size - 4);

    const positions = alignmentPositions(version);
    const last = positions.length - 1;
    positions.forEach((cx, i) => {
      positions.forEach((cy, j) => {
        if ((i === 0 && j === 0) || (i === 0 && j === last) || (i === last && j === 0)) return;
        this.drawAlignment(cx, cy);
      });
    });

    this.drawFormat(0); // jagah rakh lete hain; asal bits mask chunne ke baad aate hain
    this.drawVersion();
  }

  private drawFinder(cx: number, cy: number): void {
    for (let dy = -4; dy <= 4; dy += 1) {
      for (let dx = -4; dx <= 4; dx += 1) {
        const distance = Math.max(Math.abs(dx), Math.abs(dy));
        const x = cx + dx;
        const y = cy + dy;
        if (x >= 0 && x < this.size && y >= 0 && y < this.size) this.setFunction(x, y, distance !== 2 && distance !== 4);
      }
    }
  }

  private drawAlignment(cx: number, cy: number): void {
    for (let dy = -2; dy <= 2; dy += 1) {
      for (let dx = -2; dx <= 2; dx += 1) this.setFunction(cx + dx, cy + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
    }
  }

  drawFormat(mask: number): void {
    const { size } = this;
    const data = (FORMAT_BITS[this.ecc] << 3) | mask;
    let rem = data;
    for (let i = 0; i < 10; i += 1) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
    const bits = ((data << 10) | rem) ^ 0x5412;

    for (let i = 0; i <= 5; i += 1) this.setFunction(8, i, bit(bits, i));
    this.setFunction(8, 7, bit(bits, 6));
    this.setFunction(8, 8, bit(bits, 7));
    this.setFunction(7, 8, bit(bits, 8));
    for (let i = 9; i < 15; i += 1) this.setFunction(14 - i, 8, bit(bits, i));

    for (let i = 0; i < 8; i += 1) this.setFunction(size - 1 - i, 8, bit(bits, i));
    for (let i = 8; i < 15; i += 1) this.setFunction(8, size - 15 + i, bit(bits, i));
    this.setFunction(8, size - 8, true); // hamesha gehra
  }

  private drawVersion(): void {
    if (this.version < 7) return;
    let rem = this.version;
    for (let i = 0; i < 12; i += 1) rem = (rem << 1) ^ ((rem >>> 11) * 0x1f25);
    const bits = (this.version << 12) | rem;
    for (let i = 0; i < 18; i += 1) {
      const a = this.size - 11 + (i % 3);
      const b = Math.floor(i / 3);
      this.setFunction(a, b, bit(bits, i));
      this.setFunction(b, a, bit(bits, i));
    }
  }

  drawCodewords(data: number[]): void {
    const { size } = this;
    let i = 0;
    for (let right = size - 1; right >= 1; right -= 2) {
      if (right === 6) right = 5;
      for (let vert = 0; vert < size; vert += 1) {
        for (let j = 0; j < 2; j += 1) {
          const x = right - j;
          const upward = ((right + 1) & 2) === 0;
          const y = upward ? size - 1 - vert : vert;
          if (this.reserved[y * size + x] === 0 && i < data.length * 8) {
            this.modules[y * size + x] = bit(data[i >>> 3] ?? 0, 7 - (i & 7)) ? 1 : 0;
            i += 1;
          }
        }
      }
    }
  }

  applyMask(mask: number): void {
    const { size } = this;
    for (let y = 0; y < size; y += 1) {
      for (let x = 0; x < size; x += 1) {
        let invert: boolean;
        switch (mask) {
          case 0: invert = (x + y) % 2 === 0; break;
          case 1: invert = y % 2 === 0; break;
          case 2: invert = x % 3 === 0; break;
          case 3: invert = (x + y) % 3 === 0; break;
          case 4: invert = (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0; break;
          case 5: invert = ((x * y) % 2) + ((x * y) % 3) === 0; break;
          case 6: invert = (((x * y) % 2) + ((x * y) % 3)) % 2 === 0; break;
          default: invert = (((x + y) % 2) + ((x * y) % 3)) % 2 === 0; break;
        }
        const index = y * size + x;
        if (invert && this.reserved[index] === 0) this.modules[index] = (this.modules[index] ?? 0) ^ 1;
      }
    }
  }

  // Kam penalty = scan karna aasaan. Koi bhi mask decode ke liye theek hai; ye sirf behtareen chunta hai.
  penalty(): number {
    const { size, modules } = this;
    const at = (x: number, y: number) => modules[y * size + x] ?? 0;
    let total = 0;

    for (const horizontal of [true, false]) {
      for (let a = 0; a < size; a += 1) {
        let run = 1;
        const line: number[] = [];
        for (let b = 0; b < size; b += 1) {
          const value = horizontal ? at(b, a) : at(a, b);
          line.push(value);
          if (b > 0 && value === line[b - 1]) {
            run += 1;
            if (run === 5) total += 3;
            else if (run > 5) total += 1;
          } else {
            run = 1;
          }
        }
        const text = line.join("");
        for (const pattern of ["10111010000", "00001011101"]) {
          let from = text.indexOf(pattern);
          while (from !== -1) {
            total += 40;
            from = text.indexOf(pattern, from + 1);
          }
        }
      }
    }

    let dark = 0;
    for (let y = 0; y < size; y += 1) {
      for (let x = 0; x < size; x += 1) {
        const color = at(x, y);
        dark += color;
        if (x < size - 1 && y < size - 1 && color === at(x + 1, y) && color === at(x, y + 1) && color === at(x + 1, y + 1)) total += 3;
      }
    }
    const cells = size * size;
    total += (Math.ceil(Math.abs(dark * 20 - cells * 10) / cells) - 1) * 10;
    return total;
  }
}

function alignmentPositions(version: number): number[] {
  if (version === 1) return [];
  const count = Math.floor(version / 7) + 2;
  const step = version === 32 ? 26 : Math.ceil((version * 4 + 4) / (count * 2 - 2)) * 2;
  const result = [6];
  for (let position = version * 4 + 10; result.length < count; position -= step) result.splice(1, 0, position);
  return result;
}

// Text ko UTF-8 byte mode mein QR code banata hai. Version sab se chhota chunta hai jo text ko samaye.
export function encodeQr(text: string, ecc: EccLevel): QrResult {
  const bytes = Array.from(new TextEncoder().encode(text));
  if (bytes.length === 0) return { ok: false, error: "Enter some text first." };
  if (bytes.length > MAX_BYTES) {
    return { ok: false, error: `This text is too long for a QR code that phones can scan easily. Use ${MAX_BYTES} bytes or fewer (about ${MAX_BYTES} English letters).` };
  }

  let version = 1;
  while (version <= 40 && byteCapacity(version, ecc) < bytes.length) version += 1;
  if (version > 40) return { ok: false, error: "This text is too long for a QR code. Shorten it or choose a lower error correction level." };

  // Bits: mode (0100 = byte), tadaad, data, terminator, bharti
  const bits: number[] = [];
  const push = (value: number, length: number) => {
    for (let i = length - 1; i >= 0; i -= 1) bits.push((value >>> i) & 1);
  };
  push(0x4, 4);
  push(bytes.length, version <= 9 ? 8 : 16);
  for (const byte of bytes) push(byte, 8);

  const capacityBits = dataCodewords(version, ecc) * 8;
  push(0, Math.min(4, capacityBits - bits.length));
  push(0, (8 - (bits.length % 8)) % 8);
  for (let pad = 0xec; bits.length < capacityBits; pad ^= 0xec ^ 0x11) push(pad, 8);

  const data: number[] = [];
  for (let i = 0; i < bits.length; i += 8) {
    let byte = 0;
    for (let j = 0; j < 8; j += 1) byte = (byte << 1) | (bits[i + j] ?? 0);
    data.push(byte);
  }

  const builder = new Builder(version, ecc);
  builder.drawCodewords(addEccAndInterleave(data, version, ecc));

  let bestMask = 0;
  let bestPenalty = Infinity;
  for (let mask = 0; mask < 8; mask += 1) {
    builder.applyMask(mask);
    builder.drawFormat(mask);
    const penalty = builder.penalty();
    if (penalty < bestPenalty) {
      bestPenalty = penalty;
      bestMask = mask;
    }
    builder.applyMask(mask); // wapas seedha (mask do baar lagao to khatam)
  }
  builder.applyMask(bestMask);
  builder.drawFormat(bestMask);

  return { ok: true, qr: { version, size: builder.size, ecc, mask: bestMask, modules: builder.modules } };
}