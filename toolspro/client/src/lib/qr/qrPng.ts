import { canvasToBlob } from "../image/canvasImage";
import { isDark, type QrCode } from "./qrEncoder";
import { qrPixelSize } from "./qrRender";

// Sirf browser mein chalta hai (canvas chahiye), is liye iske unit test nahi hain.
export async function qrToPng(
  qr: QrCode,
  margin: number,
  targetPixels: number,
  foreground: string,
  background: string | null
): Promise<Blob | null> {
  const { scale, pixels } = qrPixelSize(qr.size, margin, targetPixels);
  const canvas = document.createElement("canvas");
  try {
    canvas.width = pixels;
    canvas.height = pixels;
    const context = canvas.getContext("2d");
    if (!context) return null;
    if (background !== null) {
      context.fillStyle = background;
      context.fillRect(0, 0, pixels, pixels);
    }
    context.fillStyle = foreground;
    for (let y = 0; y < qr.size; y += 1) {
      for (let x = 0; x < qr.size; x += 1) {
        if (isDark(qr, x, y)) context.fillRect((x + margin) * scale, (y + margin) * scale, scale, scale);
      }
    }
    return await canvasToBlob(canvas, "image/png", undefined);
  } catch {
    return null;
  } finally {
    canvas.width = 0;
    canvas.height = 0;
  }
}