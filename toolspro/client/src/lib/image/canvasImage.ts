import { MAX_PIXELS, fitWithin, getOutputFormat, type OutputMime } from "./imageCore";

export interface ProcessOptions {
  mime: OutputMime;
  quality: number; // 0.01 se 1
  maxSide: number | null; // lambi side ki had, null = asli size
  background: string; // JPG mein transparent hissa is rang se bharta hai
}

export type ProcessResult =
  | { ok: true; blob: Blob; sourceWidth: number; sourceHeight: number; width: number; height: number }
  | { ok: false; error: string };

const fail = (error: string): ProcessResult => ({ ok: false, error });
// Canvas se file banata hai. Browser apna format na bana sake to chupke se PNG deta hai; usay yahan pakarte hain.
export async function canvasToBlob(canvas: HTMLCanvasElement, mime: OutputMime, quality: number | undefined): Promise<Blob | null> {
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, mime, quality));
  return blob && blob.type === mime ? blob : null;
}

// Sirf browser mein chalta hai (canvas chahiye), is liye iske unit test nahi hain.
export async function processImage(file: Blob, options: ProcessOptions): Promise<ProcessResult> {
  const format = getOutputFormat(options.mime);
  if (!format) return fail("Choose a valid output format.");

  let bitmap: ImageBitmap | null = null;
  let canvas: HTMLCanvasElement | null = null;

  try {
    try {
      bitmap = await createImageBitmap(file);
    } catch {
      // File ka naam ya type kuch bhi ho, asli faisla yahan hota hai: khul sakti hai ya nahi
      return fail("This file could not be read as an image. It may be damaged or in a format your browser cannot open.");
    }

    const sourceWidth = bitmap.width;
    const sourceHeight = bitmap.height;
    if (sourceWidth * sourceHeight > MAX_PIXELS) {
      return fail("This image has too many pixels for your browser to handle safely.");
    }

    const { width, height } = fitWithin(sourceWidth, sourceHeight, options.maxSide);
    canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d");
    if (!context) return fail("Your browser could not prepare the image.");

    // JPG mein transparency nahi hoti: bina rang bhare transparent hissa kala ho jata hai
    if (options.mime === "image/jpeg") {
      context.fillStyle = options.background;
      context.fillRect(0, 0, width, height);
    }
    context.imageSmoothingQuality = "high";
    context.drawImage(bitmap, 0, 0, width, height);

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas?.toBlob(resolve, options.mime, format.lossy ? options.quality : undefined);
    });
    if (!blob) return fail("The image could not be created. It may be too large for your browser.");

    // Browser apna format na bana sake to chupke se PNG de deta hai; usay pakarna zaroori hai
    if (blob.type !== options.mime) {
      return fail(`Your browser cannot create ${format.label} files. Choose another format.`);
    }
    return { ok: true, blob, sourceWidth, sourceHeight, width, height };
  } catch {
    return fail("The image could not be processed. It may be too large for your browser.");
  } finally {
    bitmap?.close(); // decode ki hui tasveer ki memory wapas
    if (canvas) {
      canvas.width = 0; // canvas ki memory wapas (khaas taur par Safari mein)
      canvas.height = 0;
    }
  }
}