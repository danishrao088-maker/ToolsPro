import { buildZipCompressed, type ZipFile } from "../image/zip";

// 1 inch = 914400 EMU = 1440 twips; 1 pixel (96 dpi) = 9525 EMU
const EMU_PER_PIXEL = 9525;
const EMU_PER_TWIP = 635;
const MAX_PAGE_TWIPS = 31680; // Word ka sab se bara page 22 inch hai
const MIN_PAGE_TWIPS = 720; // 0.5 inch

export type PageSize = "a4" | "letter" | "match";
export type Margin = "none" | "small" | "normal";
export type SizeMode = "fit" | "original";

export const PAGE_SIZES: { value: PageSize; label: string }[] = [
  { value: "a4", label: "A4" },
  { value: "letter", label: "US Letter" },
  { value: "match", label: "Same shape as each picture" },
];

export const MARGINS: { value: Margin; label: string; twips: number }[] = [
  { value: "none", label: "No margin", twips: 0 },
  { value: "small", label: "Small (0.5 inch)", twips: 720 },
  { value: "normal", label: "Normal (1 inch)", twips: 1440 },
];

export const SIZE_MODES: { value: SizeMode; label: string }[] = [
  { value: "fit", label: "Fill the page" },
  { value: "original", label: "Keep the picture size (shrink only if too big)" },
];

export interface DocxImage {
  name: string; // alt text ke liye
  extension: "jpg" | "png";
  data: Uint8Array;
  width: number; // pixels
  height: number;
}

export interface DocxOptions {
  pageSize: PageSize;
  margin: Margin;
  sizeMode: SizeMode;
}

// XML mein ye control characters allowed nahi hain (tab, new line aur return allowed hain)
function isXmlSafe(code: number): boolean {
  if (code < 0x20) return code === 0x09 || code === 0x0a || code === 0x0d;
  return code !== 0xfffe && code !== 0xffff;
}

export function escapeXml(text: string): string {
  let clean = "";
  for (const char of text) {
    if (isXmlSafe(char.codePointAt(0) ?? 0)) clean += char;
  }
  return clean
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export interface PageLayout {
  pageWidth: number; // twips
  pageHeight: number;
  margin: number;
  imageWidth: number; // EMU
  imageHeight: number;
}

const marginTwips = (margin: Margin) => MARGINS.find((m) => m.value === margin)?.twips ?? 1440;

// Ek picture ke liye page ka size aur picture ka size (Word ki ikaiyan: twips aur EMU) nikalta hai
export function layoutPage(image: { width: number; height: number }, options: DocxOptions): PageLayout {
  const margin = marginTwips(options.margin);
  const naturalW = image.width * EMU_PER_PIXEL;
  const naturalH = image.height * EMU_PER_PIXEL;

  let pageWidth: number;
  let pageHeight: number;
  if (options.pageSize === "match") {
    // Page picture ke barabar (margin ke saath), Word ki had ke andar
    const wantW = Math.round(naturalW / EMU_PER_TWIP) + margin * 2;
    const wantH = Math.round(naturalH / EMU_PER_TWIP) + margin * 2;
    const shrink = Math.min(1, MAX_PAGE_TWIPS / Math.max(wantW, wantH));
    pageWidth = Math.max(MIN_PAGE_TWIPS, Math.round(wantW * shrink));
    pageHeight = Math.max(MIN_PAGE_TWIPS, Math.round(wantH * shrink));
  } else {
    const [w, h] = options.pageSize === "a4" ? [11906, 16838] : [12240, 15840];
    const landscape = image.width > image.height;
    pageWidth = landscape ? h : w;
    pageHeight = landscape ? w : h;
  }

  const areaW = Math.max(1, (pageWidth - margin * 2) * EMU_PER_TWIP);
  // Thora sa neeche chhor dete hain, warna bilkul bhare picture ke baad Word khali page bana deta hai
  const areaH = Math.max(1, (pageHeight - margin * 2) * EMU_PER_TWIP - 45720);

  const fillScale = Math.min(areaW / naturalW, areaH / naturalH);
  const scale = options.sizeMode === "fit" || options.pageSize === "match" ? fillScale : Math.min(1, fillScale);
  return {
    pageWidth,
    pageHeight,
    margin,
    imageWidth: Math.max(1, Math.round(naturalW * scale)),
    imageHeight: Math.max(1, Math.round(naturalH * scale)),
  };
}

function sectionXml(layout: PageLayout): string {
  const orient = layout.pageWidth > layout.pageHeight ? ' w:orient="landscape"' : "";
  const m = layout.margin;
  return (
    `<w:sectPr><w:pgSz w:w="${layout.pageWidth}" w:h="${layout.pageHeight}"${orient}/>` +
    `<w:pgMar w:top="${m}" w:right="${m}" w:bottom="${m}" w:left="${m}" w:header="0" w:footer="0" w:gutter="0"/></w:sectPr>`
  );
}

function drawingXml(index: number, image: DocxImage, layout: PageLayout): string {
  const id = index + 1;
  const name = escapeXml(image.name);
  return (
    `<w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0">` +
    `<wp:extent cx="${layout.imageWidth}" cy="${layout.imageHeight}"/>` +
    `<wp:docPr id="${id}" name="Picture ${id}" descr="${name}"/>` +
    `<wp:cNvGraphicFramePr><a:graphicFrameLocks noChangeAspect="1"/></wp:cNvGraphicFramePr>` +
    `<a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">` +
    `<pic:pic><pic:nvPicPr><pic:cNvPr id="${id}" name="${name}"/><pic:cNvPicPr/></pic:nvPicPr>` +
    `<pic:blipFill><a:blip r:embed="rId${id}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill>` +
    `<pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${layout.imageWidth}" cy="${layout.imageHeight}"/></a:xfrm>` +
    `<a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic>` +
    `</a:graphicData></a:graphic></wp:inline></w:drawing></w:r>`
  );
}

export function documentXml(images: DocxImage[], options: DocxOptions): string {
  const layouts = images.map((image) => layoutPage(image, options));
  const paragraphs = images.map((image, index) => {
    const layout = layouts[index];
    if (!layout) return "";
    const isLast = index === images.length - 1;
    // Har picture apne page par: aakhri ko chhor kar har paragraph apna section khatam karta hai
    const props = `<w:pPr><w:spacing w:before="0" w:after="0" w:line="240" w:lineRule="auto"/>${isLast ? "" : sectionXml(layout)}</w:pPr>`;
    return `<w:p>${props}${drawingXml(index, image, layout)}</w:p>`;
  });
  const last = layouts[layouts.length - 1];
  return (
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" ` +
    `xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" ` +
    `xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" ` +
    `xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" ` +
    `xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">` +
    `<w:body>${paragraphs.join("")}${last ? sectionXml(last) : ""}</w:body></w:document>`
  );
}

const CONTENT_TYPES =
  `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
  `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
  `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>` +
  `<Default Extension="xml" ContentType="application/xml"/>` +
  `<Default Extension="jpg" ContentType="image/jpeg"/>` +
  `<Default Extension="png" ContentType="image/png"/>` +
  `<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>` +
  `</Types>`;

const ROOT_RELS =
  `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
  `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
  `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>` +
  `</Relationships>`;

function documentRels(images: DocxImage[]): string {
  const items = images.map(
    (image, index) =>
      `<Relationship Id="rId${index + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/image${index + 1}.${image.extension}"/>`
  );
  return (
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${items.join("")}</Relationships>`
  );
}

// .docx asal mein ek ZIP hai jisme XML aur tasveerein hoti hain
export async function buildDocx(images: DocxImage[], options: DocxOptions, date: Date = new Date()): Promise<Uint8Array<ArrayBuffer>> {
  if (images.length === 0) throw new RangeError("A Word file needs at least one picture.");
  const encoder = new TextEncoder();
  const files: ZipFile[] = [
    { name: "[Content_Types].xml", data: encoder.encode(CONTENT_TYPES) },
    { name: "_rels/.rels", data: encoder.encode(ROOT_RELS) },
    { name: "word/document.xml", data: encoder.encode(documentXml(images, options)) },
    { name: "word/_rels/document.xml.rels", data: encoder.encode(documentRels(images)) },
    ...images.map((image, index) => ({ name: `word/media/image${index + 1}.${image.extension}`, data: image.data })),
  ];
  return (await buildZipCompressed(files, date)).bytes;
}