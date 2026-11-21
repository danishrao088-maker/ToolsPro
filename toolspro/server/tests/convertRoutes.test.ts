import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../src/services/officeConvert", () => ({
  officeConverter: { convertToPdf: vi.fn(), stats: () => ({ active: 0, waiting: 0 }) },
}));

import { app } from "../src/app";
import { officeConverter } from "../src/services/officeConvert";

const zip = (part: string) => Buffer.concat([Buffer.from([0x50, 0x4b, 0x03, 0x04]), Buffer.from(part)]);
const PDF = Buffer.from("%PDF-1.7 converted");
const convert = vi.mocked(officeConverter.convertToPdf);

const routes: Array<[string, string, string]> = [
  ["/api/convert/word-to-pdf", "word/document.xml", "report.docx"],
  ["/api/convert/excel-to-pdf", "xl/workbook.xml", "sheet.xlsx"],
  ["/api/convert/powerpoint-to-pdf", "ppt/presentation.xml", "deck.pptx"],
];

describe.each(routes)("POST %s", (path: string, part: string, name: string) => {
  beforeEach(() => {
    convert.mockReset();
    convert.mockResolvedValue(PDF);
  });

  it("converts the uploaded file and returns a PDF", async () => {
    const res = await request(app).post(path).set("Content-Type", "application/octet-stream").set("X-File-Name", encodeURIComponent(name)).send(zip(part));
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toContain("application/pdf");
    expect(res.headers["cache-control"]).toBe("no-store");
    expect(Buffer.from(res.body).equals(PDF)).toBe(true);
    expect(convert).toHaveBeenCalledTimes(1);
  });

  it("rejects a file of the wrong kind with 415 and never converts", async () => {
    const res = await request(app).post(path).set("Content-Type", "application/octet-stream").set("X-File-Name", "notes.txt").send(Buffer.from("hello"));
    expect(res.status).toBe(415);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe("UNSUPPORTED_FILE");
    expect(convert).not.toHaveBeenCalled();
  });
});

describe("conversion limits", () => {
  beforeEach(() => convert.mockReset());

  it("rejects an empty upload", async () => {
    const res = await request(app).post("/api/convert/word-to-pdf").set("Content-Type", "application/octet-stream").set("X-File-Name", "a.docx").send(Buffer.alloc(0));
    expect(res.status).toBe(400);
  });

  it("limits how many conversions one connection can start", async () => {
    convert.mockResolvedValue(PDF);
    const statuses: number[] = [];
    for (let i = 0; i < 15; i += 1) {
      const res = await request(app).post("/api/convert/word-to-pdf").set("Content-Type", "application/octet-stream").set("X-File-Name", "a.docx").send(zip("word/document.xml"));
      statuses.push(res.status);
      if (res.status === 429) {
        expect(res.body.error.code).toBe("RATE_LIMITED");
        break;
      }
    }
    expect(statuses).toContain(429);
  });
});