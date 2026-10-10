import { processImage } from "../image/canvasImage";
import type { DocxImage } from "./docx";
import { readImageInfo } from "./imageInfo";

export type PrepareResult = { ok: true; image: DocxImage } | { ok: false; error: string };

// File ko Word mein rakhne layak banata hai. Sirf browser mein chalta hai (canvas chahiye), is liye iske unit test nahi hain.
// - PNG, aur seedhi JPG: asli bytes wese hi jate hain (quality ka nuqsan nahi)
// - Ghumi hui (Exif) ya CMYK JPG, aur baqi types (WebP, GIF, BMP, AVIF): browser se khol kar naya bana dete hain
export async function prepareImage(file: File, name: string): Promise<PrepareResult> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const info = readImageInfo(bytes);

  if (info?.kind === "png") {
    return { ok: true, image: { name, extension: "png", data: bytes, width: info.width, height: info.height } };
  }
  if (info?.kind === "jpeg" && info.orientation === 1 && (info.components === 1 || info.components === 3)) {
    return { ok: true, image: { name, extension: "jpg", data: bytes, width: info.width, height: info.height } };
  }

  const asJpeg = info?.kind === "jpeg";
  const result = await processImage(file, { mime: asJpeg ? "image/jpeg" : "image/png", quality: 0.92, maxSide: null, background: "#ffffff" });
  if (!result.ok) return { ok: false, error: `"${file.name}": ${result.error}` };
  const data = new Uint8Array(await result.blob.arrayBuffer());
  return { ok: true, image: { name, extension: asJpeg ? "jpg" : "png", data, width: result.width, height: result.height } };
}