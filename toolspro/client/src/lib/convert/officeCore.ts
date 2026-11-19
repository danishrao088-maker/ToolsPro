import { formatBytes } from "../image/imageCore";

// Word / Excel / PowerPoint to PDF ke saajha hisse. Server ki hadd (15 MB) se mel khana zaroori hai.

export type OfficeToolId = "word" | "excel" | "powerpoint";

export const MAX_OFFICE_BYTES = 15 * 1024 * 1024;

export interface OfficeToolInfo {
  endpoint: string;
  label: string;
  extensions: string[];
  title: string;
  note: string;
}

export const OFFICE_TOOLS: Record<OfficeToolId, OfficeToolInfo> = {
  word: {
    endpoint: "word-to-pdf",
    label: "Word",
    extensions: ["docx", "doc"],
    title: "Choose a Word file or drop it here",
    note: "Fonts, spacing and page breaks can look a little different from Word, especially if the document uses fonts that our server does not have.",
  },
  excel: {
    endpoint: "excel-to-pdf",
    label: "Excel",
    extensions: ["xlsx", "xls"],
    title: "Choose an Excel file or drop it here",
    note: "Each sheet is printed with the page settings saved in the file. A wide sheet can split across several pages, so set the print area and Fit to 1 page wide in Excel first if you need that.",
  },
  powerpoint: {
    endpoint: "powerpoint-to-pdf",
    label: "PowerPoint",
    extensions: ["pptx", "ppt"],
    title: "Choose a PowerPoint file or drop it here",
    note: "Each slide becomes one page. Animations, transitions and embedded videos are not included, and fonts can look a little different.",
  },
};

export const acceptFor = (tool: OfficeToolId): string => OFFICE_TOOLS[tool].extensions.map((ext) => `.${ext}`).join(",");

export function extensionOf(name: string): string {
  const dot = name.lastIndexOf(".");
  return dot === -1 ? "" : name.slice(dot + 1).toLowerCase();
}

export type OfficeCheck = { ok: true } | { ok: false; error: string };

// Pehli chhanni. Asal faisla server karta hai (file ke asal bytes dekh kar).
export function validateOfficeFile(tool: OfficeToolId, file: { name: string; size: number }): OfficeCheck {
  const info = OFFICE_TOOLS[tool];
  if (!info.extensions.includes(extensionOf(file.name))) {
    return { ok: false, error: `"${file.name}" is not a ${info.label} file. Choose a ${info.extensions.map((ext) => `.${ext}`).join(" or ")} file.` };
  }
  if (file.size === 0) return { ok: false, error: `"${file.name}" is empty.` };
  if (file.size > MAX_OFFICE_BYTES) return { ok: false, error: `"${file.name}" is too large. The maximum is ${formatBytes(MAX_OFFICE_BYTES)}.` };
  return { ok: true };
}


// "My Report.docx" -> "My Report.pdf". Folder wale ya ajeeb characters hat jate hain.
export function pdfFileName(original: string): string {
  const dot = original.lastIndexOf(".");
  const stem = dot > 0 ? original.slice(0, dot) : original;
  const base = Array.from(stem)
    .filter((char) => char.charCodeAt(0) >= 32) // control characters (0 se 31) hata dete hain
    .join("")
    .replace(/[\\/:*?"<>|]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
  return `${base === "" || base === "." || base === ".." ? "converted" : base}.pdf`;
}