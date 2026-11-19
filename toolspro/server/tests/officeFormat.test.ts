import { describe, expect, it } from "vitest";
import { MAX_OFFICE_BYTES, allowedExtensions, checkOfficeFile, extensionOf } from "../src/services/officeFormat";

const zip = (...parts: string[]) => Buffer.concat([Buffer.from([0x50, 0x4b, 0x03, 0x04]), Buffer.from(parts.join(" "))]);
const ole = (...streams: string[]) => Buffer.concat([Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]), ...streams.map((s) => Buffer.from(s, "utf16le"))]);

function codeOf(run: () => unknown): string {
  try {
    run();
    return "no error";
  } catch (error) {
    return (error as { code?: string }).code ?? "other";
  }
}

describe("extensionOf / allowedExtensions", () => {
  it("reads the extension in lower case", () => {
    expect(extensionOf("Report.DOCX")).toBe("docx");
    expect(extensionOf("a.b.xlsx")).toBe("xlsx");
    expect(extensionOf("noextension")).toBe("");
  });
  it("lists the modern and legacy extension for each kind", () => {
    expect(allowedExtensions("word")).toEqual(["docx", "doc"]);
    expect(allowedExtensions("excel")).toEqual(["xlsx", "xls"]);
    expect(allowedExtensions("powerpoint")).toEqual(["pptx", "ppt"]);
  });
});

describe("modern files (zip based)", () => {
  it("accepts a real-looking docx, xlsx and pptx", () => {
    expect(checkOfficeFile("word", zip("word/document.xml"), "a.docx")).toEqual({ ext: "docx" });
    expect(checkOfficeFile("excel", zip("xl/workbook.xml"), "A.XLSX")).toEqual({ ext: "xlsx" });
    expect(checkOfficeFile("powerpoint", zip("ppt/presentation.xml"), "deck.pptx")).toEqual({ ext: "pptx" });
  });
  it("rejects a zip that is another kind of Office file", () => {
    expect(codeOf(() => checkOfficeFile("word", zip("xl/workbook.xml"), "a.docx"))).toBe("UNSUPPORTED_FILE");
    expect(codeOf(() => checkOfficeFile("excel", zip("word/document.xml"), "a.xlsx"))).toBe("UNSUPPORTED_FILE");
  });
  it("rejects a file that only has the right extension", () => {
    expect(codeOf(() => checkOfficeFile("word", Buffer.from("just some text"), "a.docx"))).toBe("UNSUPPORTED_FILE");
    expect(codeOf(() => checkOfficeFile("word", Buffer.from("%PDF-1.7 word/document.xml"), "a.docx"))).toBe("UNSUPPORTED_FILE");
  });
  it("rejects files with macros", () => {
    expect(codeOf(() => checkOfficeFile("word", zip("word/document.xml", "word/vbaProject.bin"), "a.docx"))).toBe("MACROS_NOT_ALLOWED");
  });
  it("says so for a password-protected file", () => {
    expect(codeOf(() => checkOfficeFile("word", ole("EncryptedPackage"), "a.docx"))).toBe("PASSWORD_PROTECTED");
    expect(codeOf(() => checkOfficeFile("excel", ole("EncryptedPackage"), "a.xlsx"))).toBe("PASSWORD_PROTECTED");
  });
  it("rejects an old-format file saved with a new extension", () => {
    expect(codeOf(() => checkOfficeFile("word", ole("WordDocument"), "a.docx"))).toBe("UNSUPPORTED_FILE");
  });
});

describe("legacy files (doc, xls, ppt)", () => {
  it("accepts real-looking legacy files", () => {
    expect(checkOfficeFile("word", ole("WordDocument"), "a.doc")).toEqual({ ext: "doc" });
    expect(checkOfficeFile("excel", ole("Workbook"), "a.xls")).toEqual({ ext: "xls" });
    expect(checkOfficeFile("excel", ole("Book"), "old.xls")).toEqual({ ext: "xls" });
    expect(checkOfficeFile("powerpoint", ole("PowerPoint Document"), "a.ppt")).toEqual({ ext: "ppt" });
  });
  it("rejects a legacy file of another kind, or a zip with a legacy name", () => {
    expect(codeOf(() => checkOfficeFile("word", ole("Workbook"), "a.doc"))).toBe("UNSUPPORTED_FILE");
    expect(codeOf(() => checkOfficeFile("word", zip("word/document.xml"), "a.doc"))).toBe("UNSUPPORTED_FILE");
  });
  it("rejects legacy files with macros but not a document that just says VBA", () => {
    expect(codeOf(() => checkOfficeFile("excel", ole("Workbook", "_VBA_PROJECT_CUR"), "a.xls"))).toBe("MACROS_NOT_ALLOWED");
    expect(checkOfficeFile("word", ole("WordDocument", "I like VBA"), "a.doc")).toEqual({ ext: "doc" });
  });
});

describe("general checks", () => {
  it("rejects wrong extensions with a helpful message", () => {
    for (const name of ["a.pdf", "a.txt", "a", "a.docm", "a.xlsx"]) {
      expect(codeOf(() => checkOfficeFile("word", zip("word/document.xml"), name))).toBe("UNSUPPORTED_FILE");
    }
    expect(() => checkOfficeFile("word", zip("word/document.xml"), "a.pdf")).toThrow(/\.docx or \.doc/);
  });
  it("rejects empty and too-large files", () => {
    expect(codeOf(() => checkOfficeFile("word", Buffer.alloc(0), "a.docx"))).toBe("EMPTY_FILE");
    expect(codeOf(() => checkOfficeFile("word", Buffer.alloc(MAX_OFFICE_BYTES + 1), "a.docx"))).toBe("FILE_TOO_LARGE");
  });
  it("never returns the user's own file name", () => {
    expect(checkOfficeFile("word", zip("word/document.xml"), "../../etc/passwd.docx")).toEqual({ ext: "docx" });
  });
});