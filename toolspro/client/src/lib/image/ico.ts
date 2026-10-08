export interface IcoImage {
  size: number; // chaurai = oonchai (pixels)
  data: Uint8Array; // PNG file ke bytes
}

const HEADER_BYTES = 6;
const ENTRY_BYTES = 16;

// .ico file: chhota header, har tasveer ka ek 16-byte record, phir tasveeron ka data.
// Naye Windows aur browsers har tasveer ke andar seedha PNG rakhne dete hain, to PNG ke bytes jaise hain waise hi jorte hain.
export function buildIco(images: IcoImage[]): Uint8Array<ArrayBuffer> {
  if (images.length === 0) throw new RangeError("An icon file needs at least one image.");
  for (const image of images) {
    if (!Number.isInteger(image.size) || image.size < 1 || image.size > 256) {
      throw new RangeError("Icon sizes must be whole numbers from 1 to 256.");
    }
  }

  const dataStart = HEADER_BYTES + ENTRY_BYTES * images.length;
  const total = images.reduce((sum, image) => sum + image.data.length, dataStart);
  const out = new Uint8Array(total);
  const view = new DataView(out.buffer);

  view.setUint16(0, 0, true); // reserved
  view.setUint16(2, 1, true); // type 1 = icon
  view.setUint16(4, images.length, true);

  let offset = dataStart;
  images.forEach((image, index) => {
    const entry = HEADER_BYTES + ENTRY_BYTES * index;
    view.setUint8(entry, image.size === 256 ? 0 : image.size); // 0 ka matlab 256
    view.setUint8(entry + 1, image.size === 256 ? 0 : image.size);
    view.setUint8(entry + 2, 0); // rang ki palette nahi
    view.setUint8(entry + 3, 0); // reserved
    view.setUint16(entry + 4, 1, true); // planes
    view.setUint16(entry + 6, 32, true); // bits per pixel
    view.setUint32(entry + 8, image.data.length, true);
    view.setUint32(entry + 12, offset, true);
    out.set(image.data, offset);
    offset += image.data.length;
  });

  return out;
}