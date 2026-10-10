export interface ZipFile {
  name: string;
  data: Uint8Array;
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

// ZIP har file ke saath uska CRC-32 (jaanch ka number) rakhta hai
export function crc32(data: Uint8Array): number {
  let c = 0xffffffff;
  for (const byte of data) c = (CRC_TABLE[(c ^ byte) & 0xff] ?? 0) ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function dosDateTime(date: Date): { time: number; day: number } {
  const year = Math.max(1980, date.getFullYear());
  return {
    time: (date.getHours() << 11) | (date.getMinutes() << 5) | (date.getSeconds() >> 1),
    day: ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate(),
  };
}

// Ek file ka tayyar record: payload wo hai jo ZIP mein likha jata hai (asal ya compressed)
interface Entry {
  name: Uint8Array;
  payload: Uint8Array;
  size: number; // asal (uncompressed) lambai
  crc: number;
  method: 0 | 8; // 0 = stored, 8 = deflate
}

function prepareName(file: ZipFile, seen: Set<string>, encoder: TextEncoder): Uint8Array {
  const name = encoder.encode(file.name);
  if (name.length === 0 || name.length > 65535) throw new RangeError("Invalid file name.");
  if (seen.has(file.name)) throw new RangeError(`Duplicate file name: ${file.name}`);
  seen.add(file.name);
  return name;
}

function checkCount(files: ZipFile[]): void {
  if (files.length === 0) throw new RangeError("A zip file needs at least one file.");
  if (files.length > 65535) throw new RangeError("Too many files for one zip file.");
}

function assemble(entries: Entry[], date: Date): Uint8Array<ArrayBuffer> {
  const localSize = entries.reduce((sum, e) => sum + 30 + e.name.length + e.payload.length, 0);
  const centralSize = entries.reduce((sum, e) => sum + 46 + e.name.length, 0);
  const total = localSize + centralSize + 22;
  if (total > 0xffffffff) throw new RangeError("The zip file would be too large.");

  const out = new Uint8Array(total);
  const view = new DataView(out.buffer);
  const { time, day } = dosDateTime(date);
  const offsets: number[] = [];

  let pos = 0;
  for (const entry of entries) {
    offsets.push(pos);
    view.setUint32(pos, 0x04034b50, true); // local file header
    view.setUint16(pos + 4, 20, true); // version needed
    view.setUint16(pos + 6, 0x0800, true); // naam UTF-8 mein hai
    view.setUint16(pos + 8, entry.method, true);
    view.setUint16(pos + 10, time, true);
    view.setUint16(pos + 12, day, true);
    view.setUint32(pos + 14, entry.crc, true);
    view.setUint32(pos + 18, entry.payload.length, true); // compressed size
    view.setUint32(pos + 22, entry.size, true); // uncompressed size
    view.setUint16(pos + 26, entry.name.length, true);
    view.setUint16(pos + 28, 0, true); // extra field nahi
    out.set(entry.name, pos + 30);
    out.set(entry.payload, pos + 30 + entry.name.length);
    pos += 30 + entry.name.length + entry.payload.length;
  }

  const centralStart = pos;
  entries.forEach((entry, index) => {
    view.setUint32(pos, 0x02014b50, true); // central directory record
    view.setUint16(pos + 4, 20, true); // version made by
    view.setUint16(pos + 6, 20, true); // version needed
    view.setUint16(pos + 8, 0x0800, true);
    view.setUint16(pos + 10, entry.method, true);
    view.setUint16(pos + 12, time, true);
    view.setUint16(pos + 14, day, true);
    view.setUint32(pos + 16, entry.crc, true);
    view.setUint32(pos + 20, entry.payload.length, true);
    view.setUint32(pos + 24, entry.size, true);
    view.setUint16(pos + 28, entry.name.length, true);
    view.setUint16(pos + 30, 0, true); // extra
    view.setUint16(pos + 32, 0, true); // comment
    view.setUint16(pos + 34, 0, true); // disk number
    view.setUint16(pos + 36, 0, true); // internal attributes
    view.setUint32(pos + 38, 0, true); // external attributes
    view.setUint32(pos + 42, offsets[index] ?? 0, true);
    out.set(entry.name, pos + 46);
    pos += 46 + entry.name.length;
  });

  view.setUint32(pos, 0x06054b50, true); // end of central directory
  view.setUint16(pos + 4, 0, true);
  view.setUint16(pos + 6, 0, true);
  view.setUint16(pos + 8, entries.length, true);
  view.setUint16(pos + 10, entries.length, true);
  view.setUint32(pos + 12, pos - centralStart, true);
  view.setUint32(pos + 16, centralStart, true);
  view.setUint16(pos + 20, 0, true); // comment nahi

  return out;
}

// Bina compression wala ("stored") ZIP. PNG/JPG pehle se compressed hoti hain, is liye yahan compression ka faida nahi.
export function buildZip(files: ZipFile[], date: Date = new Date()): Uint8Array<ArrayBuffer> {
  checkCount(files);
  const encoder = new TextEncoder();
  const seen = new Set<string>();
  const entries: Entry[] = files.map((file) => ({
    name: prepareName(file, seen, encoder),
    payload: file.data,
    size: file.data.length,
    crc: crc32(file.data),
    method: 0,
  }));
  return assemble(entries, date);
}

// Raw deflate (ZIP ka method 8). Browser mein CompressionStream se; na ho ya fail ho to null.
async function deflateRaw(data: Uint8Array): Promise<Uint8Array | null> {
  if (typeof CompressionStream === "undefined") return null;
  try {
    const stream = new Blob([new Uint8Array(data)]).stream().pipeThrough(new CompressionStream("deflate-raw"));
    return new Uint8Array(await new Response(stream).arrayBuffer());
  } catch {
    return null;
  }
}

export interface PackedEntry {
  name: string;
  size: number; // asal lambai
  packed: number; // ZIP mein lagne wali lambai
}

// ZIP jisme har file compress hoti hai, lekin sirf tab jab compress ho kar waqai chhoti ho (warna stored)
export async function buildZipCompressed(
  files: ZipFile[],
  date: Date = new Date()
): Promise<{ bytes: Uint8Array<ArrayBuffer>; entries: PackedEntry[] }> {
  checkCount(files);
  const encoder = new TextEncoder();
  const seen = new Set<string>();
  const entries: Entry[] = [];
  for (const file of files) {
    const name = prepareName(file, seen, encoder);
    const deflated = file.data.length > 0 ? await deflateRaw(file.data) : null;
    const useDeflate = deflated !== null && deflated.length < file.data.length;
    entries.push({
      name,
      payload: useDeflate && deflated ? deflated : file.data,
      size: file.data.length,
      crc: crc32(file.data),
      method: useDeflate ? 8 : 0,
    });
  }
  return {
    bytes: assemble(entries, date),
    entries: entries.map((entry, index) => ({ name: files[index]?.name ?? "", size: entry.size, packed: entry.payload.length })),
  };
}