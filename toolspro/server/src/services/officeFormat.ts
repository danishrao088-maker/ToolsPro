import { AppError } from "../utils/AppError";

// Office file ki pehchan. Server file ka naam nahi, uske asal bytes dekhta hai.
// Yahan sirf pehli jaanch hoti hai; asal faisla LibreOffice karta hai jab wo file kholta hai.

export type OfficeKind = "word" | "excel" | "powerpoint";

export const MAX_OFFICE_BYTES = 15 * 1024 * 1024;

interface Rule {
  label: string;
  modern: { ext: string; part: string };
  legacy: { ext: string; stream: string[] };
}

const RULES: Record<OfficeKind, Rule> = {
  word: { label: "Word", modern: { ext: "docx", part: "word/document.xml" }, legacy: { ext: "doc", stream: ["WordDocument"] } },
  excel: { label: "Excel", modern: { ext: "xlsx", part: "xl/workbook.xml" }, legacy: { ext: "xls", stream: ["Workbook", "Book"] } },
  powerpoint: { label: "PowerPoint", modern: { ext: "pptx", part: "ppt/presentation.xml" }, legacy: { ext: "ppt", stream: ["PowerPoint Document"] } },
};

export const OFFICE_KINDS = Object.keys(RULES) as OfficeKind[];

const ZIP_MAGIC = [0x50, 0x4b, 0x03, 0x04];
const OLE_MAGIC = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1];

const startsWith = (buffer: Buffer, magic: number[]): boolean => buffer.length >= magic.length && magic.every((byte, index) => buffer[index] === byte);

function bad(message: string, code = "UNSUPPORTED_FILE"): AppError {
  return new AppError(415, code, message);
}

export function extensionOf(fileName: string): string {
  const name = fileName.trim().toLowerCase();
  const dot = name.lastIndexOf(".");
  return dot === -1 ? "" : name.slice(dot + 1);
}

export function allowedExtensions(kind: OfficeKind): string[] {
  return [RULES[kind].modern.ext, RULES[kind].legacy.ext];
}

// Theek ho to wo extension lautata hai jisse file temp folder mein rakhi jayegi (kabhi user ka diya naam nahi).
export function checkOfficeFile(kind: OfficeKind, buffer: Buffer, fileName: string): { ext: string } {
  const rule = RULES[kind];
  const wanted = allowedExtensions(kind);
  const ext = extensionOf(fileName);

  if (buffer.length === 0) throw new AppError(400, "EMPTY_FILE", "The file is empty.");
  if (buffer.length > MAX_OFFICE_BYTES) throw new AppError(413, "FILE_TOO_LARGE", `The file is too large. The maximum is ${MAX_OFFICE_BYTES / 1024 / 1024} MB.`);
  if (!wanted.includes(ext)) throw bad(`This tool converts ${rule.label} files (${wanted.map((e) => `.${e}`).join(" or ")}).`);

  const isZip = startsWith(buffer, ZIP_MAGIC);
  const isOle = startsWith(buffer, OLE_MAGIC);

  if (ext === rule.modern.ext) {
    if (isOle) {
      // Password wali .docx/.xlsx/.pptx asal mein OLE container hoti hai jis mein "EncryptedPackage" likha hota hai
      if (buffer.includes(Buffer.from("EncryptedPackage", "utf16le"))) {
        throw bad("This file is password-protected. Remove the password in the original program and try again.", "PASSWORD_PROTECTED");
      }
      throw bad(`This file is not a real .${ext} file. Open it in ${rule.label} and save it again as .${ext}.`);
    }
    if (!isZip || !buffer.includes(Buffer.from(rule.modern.part))) {
      throw bad(`This file is not a real .${ext} file. Open it in ${rule.label} and save it again as .${ext}.`);
    }
    if (buffer.includes(Buffer.from("vbaProject.bin"))) {
      throw bad("Files that contain macros are not accepted. Save a copy without macros and try again.", "MACROS_NOT_ALLOWED");
    }
    return { ext };
  }

  // legacy: .doc / .xls / .ppt
  if (!isOle || !rule.legacy.stream.some((name) => buffer.includes(Buffer.from(name, "utf16le")))) {
    throw bad(`This file is not a real .${ext} file. Open it in ${rule.label} and save it again as .${rule.modern.ext}.`);
  }
  if (buffer.includes(Buffer.from("_VBA_PROJECT", "utf16le"))) {
    throw bad("Files that contain macros are not accepted. Save a copy without macros and try again.", "MACROS_NOT_ALLOWED");
  }
  return { ext };
}