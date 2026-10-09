import { PDFDocument, degrees } from "pdf-lib";
import { MAX_PAGES, addRotation, hasPdfHeader, type RotateAngle } from "./pdfCore";

export type PdfBytes = Uint8Array<ArrayBuffer>;
export type Failure = { ok: false; error: string };
export type LoadedPdf = { ok: true; doc: PDFDocument; pageCount: number } | Failure;
export type SavedPdf = { ok: true; bytes: PdfBytes; pages: number } | Failure;

// Natija ko ArrayBuffer wali (Blob mein jaane ke qabil) Uint8Array banata hai
const toBytes = (data: Uint8Array): PdfBytes => new Uint8Array(data);

export async function loadPdf(file: File): Promise<LoadedPdf> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!hasPdfHeader(bytes)) return { ok: false, error: `"${file.name}" does not look like a PDF file.` };
  try {
    const doc = await PDFDocument.load(bytes); // password wali PDF yahan error deti hai
    const pageCount = doc.getPageCount();
    if (pageCount === 0) return { ok: false, error: `"${file.name}" has no pages.` };
    if (pageCount > MAX_PAGES) return { ok: false, error: `"${file.name}" has too many pages. The maximum is ${MAX_PAGES}.` };
    return { ok: true, doc, pageCount };
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (/encrypt/i.test(message)) {
      return { ok: false, error: `"${file.name}" is protected with a password. Remove the password first, then try again.` };
    }
    return { ok: false, error: `"${file.name}" could not be read. It may be damaged.` };
  }
}

export async function readPageCount(file: File): Promise<{ ok: true; pageCount: number } | Failure> {
  const loaded = await loadPdf(file);
  return loaded.ok ? { ok: true, pageCount: loaded.pageCount } : loaded;
}

export async function mergePdfs(files: File[]): Promise<SavedPdf> {
  try {
    const out = await PDFDocument.create();
    for (const file of files) {
      const loaded = await loadPdf(file);
      if (!loaded.ok) return loaded;
      if (out.getPageCount() + loaded.pageCount > MAX_PAGES) {
        return { ok: false, error: `The merged PDF would have more than ${MAX_PAGES} pages.` };
      }
      const pages = await out.copyPages(loaded.doc, loaded.doc.getPageIndices());
      for (const page of pages) out.addPage(page);
    }
    return { ok: true, bytes: toBytes(await out.save()), pages: out.getPageCount() };
  } catch {
    return { ok: false, error: "The PDFs could not be merged. A file may be damaged, or your browser may be out of memory." };
  }
}

export type SplitPart = { bytes: PdfBytes; pages: number };

// Har group (page index ki list) se ek nayi PDF banata hai
export async function extractGroups(file: File, groups: number[][]): Promise<{ ok: true; parts: SplitPart[] } | Failure> {
  try {
    const loaded = await loadPdf(file);
    if (!loaded.ok) return loaded;
    const parts: SplitPart[] = [];
    for (const group of groups) {
      const out = await PDFDocument.create();
      const pages = await out.copyPages(loaded.doc, group);
      for (const page of pages) out.addPage(page);
      parts.push({ bytes: toBytes(await out.save()), pages: group.length });
    }
    return { ok: true, parts };
  } catch {
    return { ok: false, error: "The PDF could not be split. It may be damaged, or your browser may be out of memory." };
  }
}

export async function rotatePdf(file: File, pageIndexes: number[], angle: RotateAngle): Promise<SavedPdf> {
  try {
    const loaded = await loadPdf(file);
    if (!loaded.ok) return loaded;
    for (const index of pageIndexes) {
      const page = loaded.doc.getPage(index);
      page.setRotation(degrees(addRotation(page.getRotation().angle, angle)));
    }
    return { ok: true, bytes: toBytes(await loaded.doc.save()), pages: loaded.pageCount };
  } catch {
    return { ok: false, error: "The PDF could not be rotated. It may be damaged, or your browser may be out of memory." };
  }
}