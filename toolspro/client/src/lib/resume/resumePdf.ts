import { PDFDocument, PDFString, StandardFonts, rgb, type PDFFont } from "pdf-lib";
import type { ResumeFont, ResumeLayout, ResumeMeasure } from "./resumeLayout";

// Ye file pdf-lib ke standard fonts istemal karti hai (Helvetica, Times). Tests Node mein chalte hain, wahan bhi chalti hai.
const NAMES: Record<ResumeFont, { regular: StandardFonts; bold: StandardFonts }> = {
  sans: { regular: StandardFonts.Helvetica, bold: StandardFonts.HelveticaBold },
  serif: { regular: StandardFonts.TimesRoman, bold: StandardFonts.TimesRomanBold },
};

async function embed(doc: PDFDocument, font: ResumeFont): Promise<{ regular: PDFFont; bold: PDFFont }> {
  return { regular: await doc.embedFont(NAMES[font].regular), bold: await doc.embedFont(NAMES[font].bold) };
}

const cache = new Map<ResumeFont, Promise<ResumeMeasure>>();

// Text ki chaurai naapne wala function. Standard fonts ki chaurai tay hai, is liye preview aur PDF ek jaise hote hain.
export function getResumeMeasure(font: ResumeFont): Promise<ResumeMeasure> {
  let found = cache.get(font);
  if (!found) {
    found = (async () => {
      const fonts = await embed(await PDFDocument.create(), font);
      return (text: string, size: number, bold: boolean) => (bold ? fonts.bold : fonts.regular).widthOfTextAtSize(text, size);
    })();
    cache.set(font, found);
  }
  return found;
}

function hexToRgb(hex: string) {
  const part = (i: number) => parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16) / 255;
  return rgb(part(0), part(1), part(2));
}

// Layout ko asli PDF bana deta hai: text asli text hota hai (select, search aur copy ho sakta hai).
// Link wale naam par click hone wala dabba bhi lagta hai.
export async function buildResumePdf(layout: Extract<ResumeLayout, { ok: true }>, font: ResumeFont, title: string): Promise<Uint8Array<ArrayBuffer>> {
  const doc = await PDFDocument.create();
  const fonts = await embed(doc, font);
  doc.setTitle(title);
  const pages = Array.from({ length: layout.pages }, () => doc.addPage([layout.width, layout.height]));

  for (const op of layout.ops) {
    const page = pages[op.page];
    if (!page) continue;
    if (op.kind === "rule") {
      page.drawLine({ start: { x: op.x1, y: layout.height - op.y }, end: { x: op.x2, y: layout.height - op.y }, thickness: op.width, color: hexToRgb(op.color) });
    } else {
      const face = op.bold ? fonts.bold : fonts.regular;
      page.drawText(op.text, { x: op.x, y: layout.height - op.y, size: op.size, font: face, color: hexToRgb(op.color) });
      if (op.link) {
        // Click hone wala hissa: text ke upar ek chhota dabba jo link kholta hai
        const base = layout.height - op.y;
        const annotation = doc.context.obj({
          Type: "Annot",
          Subtype: "Link",
          Rect: [op.x, base - op.size * 0.25, op.x + face.widthOfTextAtSize(op.text, op.size), base + op.size * 0.85],
          Border: [0, 0, 0],
          A: { Type: "Action", S: "URI", URI: PDFString.of(op.link) },
        });
        page.node.addAnnot(doc.context.register(annotation));
      }
    }
  }
  return new Uint8Array(await doc.save());
}