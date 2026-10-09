import { describe, expect, it } from "vitest";
import {
  MAX_PAGES,
  MAX_PDF_BYTES,
  MAX_SPLIT_FILES,
  addRotation,
  baseName,
  groupLabel,
  hasPdfHeader,
  moveItem,
  parsePageRanges,
  planSplit,
  rotationTargets,
  totalSize,
  validatePdfFile,
  type PagesResult,
} from "./pdfCore";

function groups(result: PagesResult): number[][] {
  if (!result.ok) throw new Error(`Expected success but got: ${result.error}`);
  return result.groups;
}

function failure(result: PagesResult | { ok: boolean; error?: string }): string {
  if (result.ok) throw new Error("Expected an error");
  return (result as { error: string }).error;
}

describe("validatePdfFile", () => {
  it("accepts a PDF by type or by extension", () => {
    expect(validatePdfFile({ name: "a.pdf", type: "application/pdf", size: 10 }).ok).toBe(true);
    expect(validatePdfFile({ name: "A.PDF", type: "", size: 10 }).ok).toBe(true);
    expect(validatePdfFile({ name: "noext", type: "application/pdf", size: 10 }).ok).toBe(true);
  });

  it("rejects other files, empty files and large files", () => {
    expect(validatePdfFile({ name: "a.png", type: "image/png", size: 10 }).ok).toBe(false);
    expect(validatePdfFile({ name: "a.pdf.exe", type: "", size: 10 }).ok).toBe(false);
    expect(validatePdfFile({ name: "a.pdf", type: "application/pdf", size: 0 }).ok).toBe(false);
    expect(validatePdfFile({ name: "a.pdf", type: "application/pdf", size: MAX_PDF_BYTES + 1 }).ok).toBe(false);
    expect(validatePdfFile({ name: "a.pdf", type: "application/pdf", size: MAX_PDF_BYTES }).ok).toBe(true);
  });
});

describe("hasPdfHeader", () => {
  const bytes = (text: string) => new TextEncoder().encode(text);

  it("finds the header at the start or after a little junk", () => {
    expect(hasPdfHeader(bytes("%PDF-1.7\n..."))).toBe(true);
    expect(hasPdfHeader(bytes("\n\n  junk %PDF-1.4"))).toBe(true);
  });

  it("rejects other content and header-like text that is too far in", () => {
    expect(hasPdfHeader(bytes("PK\u0003\u0004 zip file"))).toBe(false);
    expect(hasPdfHeader(bytes("%PDF"))).toBe(false);
    expect(hasPdfHeader(bytes("x".repeat(2000) + "%PDF-1.7"))).toBe(false);
    expect(hasPdfHeader(new Uint8Array(0))).toBe(false);
  });
});

describe("parsePageRanges", () => {
  it("reads single pages, ranges and open ranges", () => {
    expect(groups(parsePageRanges("1-3, 5, 8-", 10))).toEqual([[0, 1, 2], [4], [7, 8, 9]]);
  });

  it("allows spaces, repeated pages and a page in several groups", () => {
    expect(groups(parsePageRanges(" 2 - 3 ,2,  1 ", 5))).toEqual([[1, 2], [1], [0]]);
  });

  it("ignores empty parts such as a trailing comma", () => {
    expect(groups(parsePageRanges("1,,2,", 3))).toEqual([[0], [1]]);
  });

  it("keeps the order the user typed", () => {
    expect(groups(parsePageRanges("5,1", 5))).toEqual([[4], [0]]);
  });

  it("rejects empty input", () => {
    expect(failure(parsePageRanges("", 5))).toContain("Enter the pages");
    expect(failure(parsePageRanges(" , ", 5))).toContain("Enter the pages");
  });

  it("rejects text, negative numbers and extra dashes", () => {
    for (const bad of ["abc", "1-2-3", "-3", "1.5", "2 3", "1;2"]) {
      expect(failure(parsePageRanges(bad, 9)), bad).toContain("not a valid page");
    }
  });

  it("rejects pages that do not exist", () => {
    expect(failure(parsePageRanges("0", 5))).toContain("Page 0 does not exist");
    expect(failure(parsePageRanges("6", 5))).toContain("Page 6 does not exist. This PDF has 5 pages.");
    expect(failure(parsePageRanges("1-9", 5))).toContain("Page 9");
    expect(failure(parsePageRanges("2", 1))).toContain("1 page.");
  });

  it("rejects a backwards range", () => {
    expect(failure(parsePageRanges("5-2", 9))).toContain("backwards");
  });

  it("limits the number of pages chosen", () => {
    expect(failure(parsePageRanges(`1-${MAX_PAGES}, 1-5`, MAX_PAGES))).toContain("too many");
    expect(parsePageRanges(`1-${MAX_PAGES}`, MAX_PAGES).ok).toBe(true);
  });
});

describe("planSplit", () => {
  it("makes one file per range", () => {
    expect(groups(planSplit("ranges-separate", "1-2, 4", 5))).toEqual([[0, 1], [3]]);
  });

  it("puts all chosen pages into one file, in order", () => {
    expect(groups(planSplit("ranges-one", "4, 1-2", 5))).toEqual([[3, 0, 1]]);
  });

  it("makes one file per page and ignores the text", () => {
    expect(groups(planSplit("every-page", "nonsense", 3))).toEqual([[0], [1], [2]]);
  });

  it("passes on errors from the page list, but only when it is needed", () => {
    expect(planSplit("ranges-one", "9", 3).ok).toBe(false);
    expect(planSplit("every-page", "9", 3).ok).toBe(true);
    expect(planSplit("every-page", "", MAX_SPLIT_FILES + 1).ok).toBe(false);
    expect(planSplit("every-page", "", MAX_SPLIT_FILES).ok).toBe(true);
  });
});

describe("groupLabel", () => {
  it("describes single, contiguous and scattered pages", () => {
    expect(groupLabel([4])).toBe("page-5");
    expect(groupLabel([0, 1, 2])).toBe("pages-1-3");
    expect(groupLabel([0, 3, 6])).toBe("pages-1_4_7");
    expect(groupLabel([5, 4])).toBe("pages-6_5");
    expect(groupLabel([0, 2, 4, 6, 8, 10, 12])).toBe("pages-1_3_5_7_9_etc");
    expect(groupLabel([])).toBe("pages");
  });
});

describe("rotation", () => {
  it("adds angles and keeps the result between 0 and 270", () => {
    expect(addRotation(0, 90)).toBe(90);
    expect(addRotation(270, 90)).toBe(0);
    expect(addRotation(180, 270)).toBe(90);
    expect(addRotation(-90, 90)).toBe(0);
    expect(addRotation(-90, 180)).toBe(90);
    expect(addRotation(450, 90)).toBe(180);
  });

  it("chooses all pages or the pages in the list, once each", () => {
    expect(rotationTargets("all", "ignored", 3)).toEqual({ ok: true, pages: [0, 1, 2] });
    expect(rotationTargets("range", "3, 1-2, 2", 5)).toEqual({ ok: true, pages: [0, 1, 2] });
    expect(rotationTargets("range", "9", 5).ok).toBe(false);
  });
});

describe("moveItem and totalSize", () => {
  it("moves an item without changing the original list", () => {
    const list = ["a", "b", "c", "d"];
    expect(moveItem(list, 0, 2)).toEqual(["b", "c", "a", "d"]);
    expect(moveItem(list, 3, 0)).toEqual(["d", "a", "b", "c"]);
    expect(list).toEqual(["a", "b", "c", "d"]);
  });

  it("returns a copy when the move makes no sense", () => {
    const list = ["a", "b"];
    for (const [from, to] of [[0, 0], [-1, 1], [0, 2], [2, 0]] as const) {
      const result = moveItem(list, from, to);
      expect(result).toEqual(["a", "b"]);
      expect(result).not.toBe(list);
    }
  });

  it("adds file sizes", () => {
    expect(totalSize([{ size: 1 }, { size: 2 }, { size: 4 }])).toBe(7);
    expect(totalSize([])).toBe(0);
  });
});

describe("baseName", () => {
  it("removes only a final .pdf", () => {
    expect(baseName("report.PDF")).toBe("report");
    expect(baseName("v1.2.pdf")).toBe("v1.2");
    expect(baseName("notes.pdf.txt")).toBe("notes.pdf.txt");
    expect(baseName("plain")).toBe("plain");
  });
});