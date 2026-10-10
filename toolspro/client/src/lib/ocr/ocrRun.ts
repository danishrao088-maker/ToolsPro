import { createWorker, type Worker } from "tesseract.js";
import { processImage } from "../image/canvasImage";
import { MAX_OCR_SIDE, cleanOcrText } from "./ocrCore";

export type OcrOutcome = { ok: true; text: string; confidence: number } | { ok: false; error: string };

export interface OcrJob {
  result: Promise<OcrOutcome>;
  cancel: () => void;
}

// Status ke angrezi naam se insani lafz
function stageLabel(status: string): string {
  if (status === "recognizing text") return "Reading the text";
  if (status.includes("language")) return "Loading the language data";
  return "Getting ready";
}

// Sirf browser mein chalta hai (worker, wasm aur canvas chahiye), is liye iske unit test nahi hain.
// Tesseract ki saari files hamari apni site se aati hain: /tesseract/worker.min.js, /tesseract/core/, /tessdata/
export function startOcr(file: File, languageCode: string, onProgress: (label: string, percent: number | null) => void): OcrJob {
  let cancelled = false;
  let worker: Worker | null = null;

  const cancel = () => {
    cancelled = true;
    const current = worker;
    worker = null;
    if (current) void current.terminate().catch(() => undefined);
  };

  const run = async (): Promise<OcrOutcome> => {
    // Pehle tasveer ko saaf PNG banate hain: Exif ghumaav theek ho jata hai aur bohat bari tasveer chhoti ho jati hai
    const prepared = await processImage(file, { mime: "image/png", quality: 1, maxSide: MAX_OCR_SIDE, background: "#ffffff" });
    if (!prepared.ok) return { ok: false, error: prepared.error };
    if (cancelled) return { ok: false, error: "Stopped." };

    onProgress("Getting ready", null);
    const created = await createWorker(languageCode, 1, {
      workerPath: "/tesseract/worker.min.js",
      corePath: "/tesseract/core",
      langPath: "/tessdata",
      logger: (message) => {
        if (cancelled) return;
        const percent = message.status === "recognizing text" ? Math.round(message.progress * 100) : null;
        onProgress(stageLabel(message.status), percent);
      },
    });
    if (cancelled) {
      void created.terminate().catch(() => undefined);
      return { ok: false, error: "Stopped." };
    }
    worker = created;

    try {
      const { data } = await created.recognize(prepared.blob);
      if (cancelled) return { ok: false, error: "Stopped." };
      return { ok: true, text: cleanOcrText(data.text), confidence: data.confidence };
    } finally {
      if (worker === created) {
        worker = null;
        void created.terminate().catch(() => undefined);
      }
    }
  };

  const result = run().catch((): OcrOutcome => ({
    ok: false,
    error: "The text could not be read. The language files may be missing, or your browser may be out of memory.",
  }));
  return { result, cancel };
}