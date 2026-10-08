import { svgToDataUrl } from "./dataUrl";
import { canvasToBlob } from "./canvasImage";
import { getOutputFormat, type OutputMime } from "./imageCore";

export type RenderResult = { ok: true; blob: Blob } | { ok: false; error: string };

// SVG ko <img> ke zariye kholte hain: is tarah SVG ke andar ka koi script kabhi nahi chalta
export async function loadSvgImage(svgText: string): Promise<HTMLImageElement | null> {
  const image = new Image();
  image.src = svgToDataUrl(svgText);
  try {
    await image.decode();
    return image;
  } catch {
    return null;
  }
}

export async function renderSvg(
  svgText: string,
  width: number,
  height: number,
  mime: OutputMime,
  quality: number,
  background: string | null
): Promise<RenderResult> {
  const format = getOutputFormat(mime);
  if (!format) return { ok: false, error: "Choose a valid output format." };

  const image = await loadSvgImage(svgText);
  if (!image) return { ok: false, error: "This SVG could not be drawn. It may be damaged or use features your browser does not support." };

  const canvas = document.createElement("canvas");
  try {
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) return { ok: false, error: "Your browser could not prepare the image." };

    // JPG mein transparency nahi hoti, is liye rang zaroori hai
    const fill = mime === "image/jpeg" ? (background ?? "#ffffff") : background;
    if (fill) {
      context.fillStyle = fill;
      context.fillRect(0, 0, width, height);
    }
    context.imageSmoothingQuality = "high";
    context.drawImage(image, 0, 0, width, height);

    const blob = await canvasToBlob(canvas, mime, format.lossy ? quality : undefined);
    if (!blob) return { ok: false, error: `Your browser cannot create ${format.label} files. Choose another format.` };
    return { ok: true, blob };
  } catch {
    return { ok: false, error: "The image could not be created. It may be too large for your browser." };
  } finally {
    canvas.width = 0;
    canvas.height = 0;
  }
}