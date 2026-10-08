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

// Bina compression wala ("stored") ZIP. PNG pehle se compressed hoti hai, is liye yahan compression ka faida nahi.
export function buildZip(files: ZipFile[], date: Date = new Date()): Uint8Array<ArrayBuffer> {
  if (files.length === 0) throw new RangeError("A zip file needs at least one file.");
  if (files.length > 65535) throw new RangeError("Too many files for one zip file.");

  const encoder = new TextEncoder();
  const seen = new Set<string>();
  const entries = files.map((file) => {
    const name = encoder.encode(file.name);
    if (name.length === 0 || name.length > 65535) throw new RangeError("Invalid file name.");
    if (seen.has(file.name)) throw new RangeError(`Duplicate file name: ${file.name}`);
    seen.add(file.name);
    return { name, data: file.data, crc: crc32(file.data) };
  });

  const localSize = entries.reduce((sum, e) => sum + 30 + e.name.length + e.data.length, 0);
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
    view.setUint16(pos + 8, 0, true); // method 0 = stored
    view.setUint16(pos + 10, time, true);
    view.setUint16(pos + 12, day, true);
    view.setUint32(pos + 14, entry.crc, true);
    view.setUint32(pos + 18, entry.data.length, true);
    view.setUint32(pos + 22, entry.data.length, true);
    view.setUint16(pos + 26, entry.name.length, true);
    view.setUint16(pos + 28, 0, true); // extra field nahi
    out.set(entry.name, pos + 30);
    out.set(entry.data, pos + 30 + entry.name.length);
    pos += 30 + entry.name.length + entry.data.length;
  }

  const centralStart = pos;
  entries.forEach((entry, index) => {
    view.setUint32(pos, 0x02014b50, true); // central directory record
    view.setUint16(pos + 4, 20, true); // version made by
    view.setUint16(pos + 6, 20, true); // version needed
    view.setUint16(pos + 8, 0x0800, true);
    view.setUint16(pos + 10, 0, true);
    view.setUint16(pos + 12, time, true);
    view.setUint16(pos + 14, day, true);
    view.setUint32(pos + 16, entry.crc, true);
    view.setUint32(pos + 20, entry.data.length, true);
    view.setUint32(pos + 24, entry.data.length, true);
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