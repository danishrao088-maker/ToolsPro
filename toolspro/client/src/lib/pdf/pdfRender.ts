import * as pdfjs from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { canvasToBlob } from "../image/canvasImage";
import { qualityValue, type OutputMime } from "../image/imageCore";
import { MAX_PAGES, hasPdfHeader } from "./pdfCore";
import { pageRenderSize } from "./pdfImage";

// pdf.js ko chalne ke liye teen cheezein chahiye: worker (Vite deta hai) aur teen folders jo hum public/pdfjs mein rakhte hain.
// Ye folders bina server ke apni hi site se aate hain, kisi bahari site se nahi.
pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

const ASSETS = {
  standardFontDataUrl: "/pdfjs/standard_fonts/",
  cMapUrl: "/pdfjs/cmaps/",
  cMapPacked: true,
  wasmUrl: "/pdfjs/wasm/",
};

const THUMB_WIDTH = 120;

export interface RenderedPage {
  blob: Blob;
  width: number;
  height: number;
  thumbnail: string; // chhoti tasveer (data URL), sirf list mein dikhane ke liye
}

export type PageResult = { ok: true; page: RenderedPage } | { ok: false; error: string };

export interface PdfSession {
  pageCount: number;
  renderPage: (index: number, dpi: number, mime: OutputMime, qualityPercent: number) => Promise<PageResult>;
  close: () => void;
}

export type OpenResult = { ok: true; session: PdfSession } | { ok: false; error: string };

// Sirf browser mein chalta hai (worker aur canvas chahiye), is liye iske unit test nahi hain.
export async function openPdfForRender(file: File): Promise<OpenResult> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!hasPdfHeader(bytes)) return { ok: false, error: `"${file.name}" does not look like a PDF file.` };

  const task = pdfjs.getDocument({ data: bytes, ...ASSETS });
  try {
    const doc = await task.promise;
    if (doc.numPages > MAX_PAGES) {
      void task.destroy();
      return { ok: false, error: `"${file.name}" has too many pages. The maximum is ${MAX_PAGES}.` };
    }

    const session: PdfSession = {
      pageCount: doc.numPages,
      close: () => void task.destroy(),
      renderPage: async (index, dpi, mime, qualityPercent) => {
        const canvas = document.createElement("canvas");
        try {
          const page = await doc.getPage(index + 1);
          const base = page.getViewport({ scale: 1 });
          const size = pageRenderSize(base.width, base.height, dpi);
          if (!size.ok) return size;

          const viewport = page.getViewport({ scale: size.scale });
          canvas.width = size.width;
          canvas.height = size.height;
          const context = canvas.getContext("2d");
          if (!context) return { ok: false, error: "Your browser could not prepare the page." };

          // PDF ka page "kagaz" hai: peeche safed rang, warna JPG mein transparent hissa kala ho jata hai
          context.fillStyle = "#ffffff";
          context.fillRect(0, 0, size.width, size.height);
          await page.render({ canvas, viewport }).promise;
          page.cleanup();

          const blob = await canvasToBlob(canvas, mime, mime === "image/jpeg" ? qualityValue(qualityPercent) : undefined);
          if (!blob) return { ok: false, error: "Your browser could not create the image. Try a lower resolution." };

          const thumb = document.createElement("canvas");
          thumb.width = THUMB_WIDTH;
          thumb.height = Math.max(1, Math.round((size.height / size.width) * THUMB_WIDTH));
          thumb.getContext("2d")?.drawImage(canvas, 0, 0, thumb.width, thumb.height);
          const thumbnail = thumb.toDataURL("image/jpeg", 0.7);
          thumb.width = 0;
          thumb.height = 0;

          return { ok: true, page: { blob, width: size.width, height: size.height, thumbnail } };
        } catch {
          return { ok: false, error: `Page ${index + 1} could not be drawn. The PDF may be damaged, or your browser may be out of memory.` };
        } finally {
          canvas.width = 0; // canvas ki memory wapas
          canvas.height = 0;
        }
      },
    };
    return { ok: true, session };
  } catch (error) {
    void task.destroy();
    const name = error instanceof Error ? error.name : "";
    if (name === "PasswordException") {
      return { ok: false, error: `"${file.name}" is protected with a password. Remove the password first, then try again.` };
    }
    return { ok: false, error: `"${file.name}" could not be read. It may be damaged.` };
  }
}