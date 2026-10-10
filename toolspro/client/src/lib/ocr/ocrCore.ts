export interface OcrLanguage {
  code: string; // tesseract ka code, file ka naam bhi yahi hai: /tessdata/<code>.traineddata.gz
  label: string;
  rtl: boolean; // dayen se bayen likhi jane wali zubaan
}

// Sirf wahi zubanen jin ki file client/public/tessdata mein rakhi ho. Nayi zubaan ke liye file rakhein aur yahan ek line jorein.
export const OCR_LANGUAGES: OcrLanguage[] = [
  { code: "eng", label: "English", rtl: false },
  { code: "urd", label: "Urdu", rtl: true },
];

export const MAX_OCR_BYTES = 20 * 1024 * 1024;
export const MAX_OCR_SIDE = 3000; // bari tasveer is se chhoti ki jati hai, warna bohat der lagti hai

export function findLanguage(code: string): OcrLanguage {
  return OCR_LANGUAGES.find((language) => language.code === code) ?? OCR_LANGUAGES[0]!;
}

// OCR ka kaccha text saaf karta hai: line endings ek jaisi, har line ke aakhir ke faltu spaces khatam, 2 se zyada khali lines ek khali line
export function cleanOcrText(raw: string): string {
  return raw
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => line.replace(/[ \t\u00a0]+$/g, ""))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export interface TextStats {
  words: number;
  characters: number;
  lines: number;
}

export function textStats(text: string): TextStats {
  const trimmed = text.trim();
  if (trimmed === "") return { words: 0, characters: 0, lines: 0 };
  return {
    words: trimmed.split(/\s+/).length,
    characters: Array.from(trimmed).length,
    lines: trimmed.split("\n").filter((line) => line.trim() !== "").length,
  };
}

// Tesseract 0-100 ka confidence deta hai. Ye sirf andaza hai, is liye lafz bhi narm rakhe hain.
export function confidenceLabel(confidence: number): string {
  if (!Number.isFinite(confidence) || confidence <= 0) return "";
  if (confidence >= 85) return "The text looks clear. Still, read it once to check.";
  if (confidence >= 60) return "Some words may be wrong. Please check the text.";
  return "The picture was hard to read. Many words may be wrong.";
}

// "scan.png" -> "scan.txt"
export function textFileName(original: string): string {
  const dot = original.lastIndexOf(".");
  const base = (dot > 0 ? original.slice(0, dot) : original).replace(/[^\p{L}\p{N} ._()-]/gu, "_").replace(/^\.+/, "").trim().slice(0, 100);
  return `${base || "text"}.txt`;
}