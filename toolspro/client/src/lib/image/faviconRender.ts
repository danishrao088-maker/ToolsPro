import { canvasToBlob } from "./canvasImage";
import { MAX_PIXELS } from "./imageCore";
import { iconPlacement, type FitMode } from "./favicon";
import { prepareSvg } from "./svgSize";
import { loadSvgImage } from "./svgRender";

export interface IconSource {
  image: CanvasImageSource;
  width: number;
  height: number;
  close: () => void;
}

export type SourceResult = { ok: true; source: IconSource } | { ok: false; error: string };

export async function loadIconSource(file: File, isSvg: boolean): Promise<SourceResult> {
  if (isSvg) {
    const prepared = prepareSvg(await file.text());
    if (!prepared.ok) return prepared;
    const image = await loadSvgImage(prepared.text);
    if (!image) return { ok: false, error: "This SVG could not be drawn. It may be damaged." };
    return { ok: true, source: { image, width: prepared.width, height: prepared.height, close: () => undefined } };
  }

  try {
    const bitmap = await createImageBitmap(file);
    if (bitmap.width * bitmap.height > MAX_PIXELS) {
      bitmap.close();
      return { ok: false, error: "This image has too many pixels for your browser to handle safely." };
    }
    return { ok: true, source: { image: bitmap, width: bitmap.width, height: bitmap.height, close: () => bitmap.close() } };
  } catch {
    return { ok: false, error: "This file could not be read as an image. It may be damaged or in a format your browser cannot open." };
  }
}

// Ek square PNG banata hai. background null ho to transparent rehta hai.
export async function renderIcon(
  source: IconSource,
  size: number,
  mode: FitMode,
  background: string | null
): Promise<Uint8Array<ArrayBuffer> | null> {
  const canvas = document.createElement("canvas");
  try {
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext("2d");
    if (!context) return null;
    if (background) {
      context.fillStyle = background;
      context.fillRect(0, 0, size, size);
    }
    context.imageSmoothingQuality = "high";
    const place = iconPlacement(source.width, source.height, size, mode);
    context.drawImage(source.image, place.x, place.y, place.width, place.height);
    const blob = await canvasToBlob(canvas, "image/png", undefined);
    return blob ? new Uint8Array(await blob.arrayBuffer()) : null;
  } catch {
    return null;
  } finally {
    canvas.width = 0;
    canvas.height = 0;
  }
}