export interface ImageInfo {
  kind: "png" | "jpeg";
  width: number;
  height: number;
  orientation: number; // EXIF 1-8 (1 = seedhi). PNG ke liye hamesha 1
  components: number; // JPEG mein rang ke channels (1 gray, 3 RGB, 4 CMYK); PNG ke liye 0
}

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

// Exif ke andar se "orientation" (tasveer kis taraf ghumi hui hai) padhta hai. Na mile to 1.
function exifOrientation(bytes: Uint8Array, start: number, end: number): number {
  // start = "Exif\0\0" ke baad TIFF header ki jagah
  if (start + 8 > end) return 1;
  const little = bytes[start] === 0x49 && bytes[start + 1] === 0x49;
  const big = bytes[start] === 0x4d && bytes[start + 1] === 0x4d;
  if (!little && !big) return 1;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const u16 = (pos: number) => view.getUint16(pos, little);
  const u32 = (pos: number) => view.getUint32(pos, little);
  const ifd = start + u32(start + 4);
  if (ifd + 2 > end) return 1;
  const count = u16(ifd);
  for (let i = 0; i < count; i += 1) {
    const entry = ifd + 2 + i * 12;
    if (entry + 12 > end) return 1;
    if (u16(entry) === 0x0112) {
      const value = u16(entry + 8);
      return value >= 1 && value <= 8 ? value : 1;
    }
  }
  return 1;
}

// PNG aur JPEG ki chaurai/lambai file ke andar se hi padh leta hai (decode kiye baghair). Aur kisi type par undefined.
export function readImageInfo(bytes: Uint8Array): ImageInfo | undefined {
  if (bytes.length >= 24 && PNG_SIGNATURE.every((value, index) => bytes[index] === value)) {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const width = view.getUint32(16);
    const height = view.getUint32(20);
    return width > 0 && height > 0 ? { kind: "png", width, height, orientation: 1, components: 0 } : undefined;
  }

  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return undefined;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let orientation = 1;
  let pos = 2;
  while (pos + 4 <= bytes.length) {
    if (bytes[pos] !== 0xff) return undefined;
    const marker = bytes[pos + 1] ?? 0;
    if (marker === 0xff) {
      pos += 1; // padding
      continue;
    }
    if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      pos += 2; // in markers ki lambai nahi hoti
      continue;
    }
    const length = view.getUint16(pos + 2);
    if (length < 2) return undefined;
    const segmentEnd = Math.min(bytes.length, pos + 2 + length);

    if (marker === 0xe1 && length >= 8) {
      const isExif = [0x45, 0x78, 0x69, 0x66, 0, 0].every((value, index) => bytes[pos + 4 + index] === value);
      if (isExif) orientation = exifOrientation(bytes, pos + 10, segmentEnd);
    }

    const isFrame = marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
    if (isFrame) {
      if (pos + 10 > bytes.length) return undefined;
      const height = view.getUint16(pos + 5);
      const width = view.getUint16(pos + 7);
      const components = bytes[pos + 9] ?? 0;
      return width > 0 && height > 0 ? { kind: "jpeg", width, height, orientation, components } : undefined;
    }
    pos += 2 + length;
  }
  return undefined;
}