import { PDFDocument } from "pdf-lib";
import { FLYER_PAPERS, type FlyerPaper } from "./flyerSvg";

// Ye file pdf-lib istemal karti hai. Tests Node mein chalte hain, wahan bhi pdf-lib chalti hai.
// Flyer ki PNG tasveer ko ek page ki PDF mein rakhta hai, page ka size kagaz ke barabar (points mein).
export async function pngToPdf(png: Uint8Array, paper: FlyerPaper): Promise<Uint8Array<ArrayBuffer>> {
  const size = FLYER_PAPERS.find((p) => p.value === paper) ?? FLYER_PAPERS[0]!;
  const doc = await PDFDocument.create();
  const image = await doc.embedPng(png);
  const page = doc.addPage([size.pointsWide, size.pointsHigh]);
  page.drawImage(image, { x: 0, y: 0, width: size.pointsWide, height: size.pointsHigh });
  return new Uint8Array(await doc.save());
}