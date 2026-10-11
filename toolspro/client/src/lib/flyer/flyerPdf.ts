import { PDFDocument } from "pdf-lib";
import { FLYER_PAPERS, type FlyerPaper } from "./flyerSvg";

// Ye file pdf-lib istemal karti hai. Tests Node mein chalte hain, wahan bhi pdf-lib chalti hai.
// PNG tasveer ko ek page ki PDF mein rakhta hai, page ka size points mein (1 inch = 72 points).
export async function pngToPdfSized(png: Uint8Array, pointsWide: number, pointsHigh: number): Promise<Uint8Array<ArrayBuffer>> {
  const doc = await PDFDocument.create();
  const image = await doc.embedPng(png);
  const page = doc.addPage([pointsWide, pointsHigh]);
  page.drawImage(image, { x: 0, y: 0, width: pointsWide, height: pointsHigh });
  return new Uint8Array(await doc.save());
}

// Flyer: page kagaz (A4 ya Letter) ke barabar
export async function pngToPdf(png: Uint8Array, paper: FlyerPaper): Promise<Uint8Array<ArrayBuffer>> {
  const size = FLYER_PAPERS.find((p) => p.value === paper) ?? FLYER_PAPERS[0]!;
  return pngToPdfSized(png, size.pointsWide, size.pointsHigh);
}