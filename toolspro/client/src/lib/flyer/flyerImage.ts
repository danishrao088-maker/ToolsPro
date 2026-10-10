import { processImage } from "../image/canvasImage";
import { bytesToDataUrl } from "../image/dataUrl";

export type PhotoResult = { ok: true; dataUrl: string } | { ok: false; error: string };

// Photo ko JPG bana kar chhota karte hain (lambi side 1600 px), taake flyer ki SVG bhari na ho.
// Sirf browser mein chalta hai (canvas chahiye), is liye iske unit test nahi hain.
export async function preparePhoto(file: File): Promise<PhotoResult> {
  const result = await processImage(file, { mime: "image/jpeg", quality: 0.85, maxSide: 1600, background: "#ffffff" });
  if (!result.ok) return { ok: false, error: result.error };
  const bytes = new Uint8Array(await result.blob.arrayBuffer());
  return { ok: true, dataUrl: bytesToDataUrl(bytes, "image/jpeg") };
}