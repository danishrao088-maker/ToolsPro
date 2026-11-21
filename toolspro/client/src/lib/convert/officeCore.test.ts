import { describe, expect, it } from "vitest";
import { MAX_OFFICE_BYTES, OFFICE_TOOLS, acceptFor, extensionOf, pdfFileName, validateOfficeFile } from "./officeCore";

describe("acceptFor / extensionOf", () => {
  it("lists the extensions for the file picker", () => {
    expect(acceptFor("word")).toBe(".docx,.doc");
    expect(acceptFor("excel")).toBe(".xlsx,.xls");
    expect(acceptFor("powerpoint")).toBe(".pptx,.ppt");
  });
  it("reads the extension in lower case", () => {
    expect(extensionOf("A.DOCX")).toBe("docx");
    expect(extensionOf("noext")).toBe("");
  });
  it("points each tool at its own endpoint", () => {
    expect(Object.values(OFFICE_TOOLS).map((tool) => tool.endpoint)).toEqual(["word-to-pdf", "excel-to-pdf", "powerpoint-to-pdf"]);
  });
});

describe("validateOfficeFile", () => {
  it("accepts the right kind of file", () => {
    expect(validateOfficeFile("word", { name: "a.docx", size: 10 })).toEqual({ ok: true });
    expect(validateOfficeFile("word", { name: "a.DOC", size: 10 })).toEqual({ ok: true });
    expect(validateOfficeFile("excel", { name: "a.xlsx", size: MAX_OFFICE_BYTES })).toEqual({ ok: true });
    expect(validateOfficeFile("powerpoint", { name: "a.ppt", size: 1 })).toEqual({ ok: true });
  });
  it("rejects another kind of file and says what is expected", () => {
    const result = validateOfficeFile("word", { name: "sheet.xlsx", size: 10 });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain(".docx or .doc");
    expect(validateOfficeFile("excel", { name: "a.pdf", size: 10 }).ok).toBe(false);
    expect(validateOfficeFile("excel", { name: "noext", size: 10 }).ok).toBe(false);
  });
  it("rejects empty and too-large files", () => {
    expect(validateOfficeFile("word", { name: "a.docx", size: 0 })).toEqual({ ok: false, error: '"a.docx" is empty.' });
    const big = validateOfficeFile("word", { name: "a.docx", size: MAX_OFFICE_BYTES + 1 });
    expect(big.ok).toBe(false);
    if (!big.ok) expect(big.error).toContain("15 MB");
  });
});

describe("pdfFileName", () => {
  it("swaps the extension", () => {
    expect(pdfFileName("Report.docx")).toBe("Report.pdf");
    expect(pdfFileName("my.old.report.xlsx")).toBe("my.old.report.pdf");
  });
  it("removes unsafe characters and falls back to converted", () => {
    expect(pdfFileName('a/b\\c:d*e?"f<g>h|i.docx')).toBe("abcdefghi.pdf");
    expect(pdfFileName("   .docx")).toBe("converted.pdf");
    expect(pdfFileName("")).toBe("converted.pdf");
    expect(pdfFileName("..docx")).toBe("converted.pdf");
  });
  it("keeps a long name within limits", () => {
    expect(pdfFileName(`${"x".repeat(300)}.docx`).length).toBe(124);
  });
});