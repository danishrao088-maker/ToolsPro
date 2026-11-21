import { Readable } from "node:stream";
import { describe, expect, it, vi } from "vitest";
import { createOfficeHandler, fileNameFrom, readBody } from "../src/controllers/convertController";
import { MAX_OFFICE_BYTES } from "../src/services/officeFormat";
import { AppError } from "../src/utils/AppError";

const DOCX = Buffer.concat([Buffer.from([0x50, 0x4b, 0x03, 0x04]), Buffer.from("word/document.xml")]);
const PDF = Buffer.from("%PDF-1.7 converted");

interface Out {
  status?: number;
  headers: Record<string, string>;
  body?: Buffer;
  error?: unknown;
}

function run(kind: "word" | "excel" | "powerpoint", chunks: Buffer[], headers: Record<string, string>, convertToPdf: (input: Buffer, ext: string) => Promise<Buffer>) {
  const handler = createOfficeHandler(kind, { convertToPdf });
  return new Promise<Out>((resolve) => {
    const out: Out = { headers: {} };
    const req = Object.assign(Readable.from(chunks), { headers }) as never;
    const res = {
      status: (code: number) => {
        out.status = code;
      },
      set: (a: string | Record<string, string>, b?: string) => {
        if (typeof a === "string") out.headers[a] = b ?? "";
        else Object.assign(out.headers, a);
      },
      send: (body: Buffer) => {
        out.body = body;
        resolve(out);
      },
    } as never;
    handler(req, res, (error?: unknown) => resolve({ ...out, error }));
  });
}

describe("readBody", () => {
  it("joins the chunks", async () => {
    expect((await readBody(Readable.from([Buffer.from("ab"), Buffer.from("cd")]), 100)).toString()).toBe("abcd");
    expect((await readBody(Readable.from([]), 100)).length).toBe(0);
  });
  it("rejects a body over the limit", async () => {
    await expect(readBody(Readable.from([Buffer.alloc(60), Buffer.alloc(60)]), 100)).rejects.toMatchObject({ statusCode: 413, code: "FILE_TOO_LARGE" });
  });
  it("stops reading far beyond the limit", async () => {
    const chunks = Array.from({ length: 10 }, () => Buffer.alloc(100));
    await expect(readBody(Readable.from(chunks), 100)).rejects.toMatchObject({ statusCode: 413 });
  });
  it("accepts exactly the limit", async () => {
    expect((await readBody(Readable.from([Buffer.alloc(100)]), 100)).length).toBe(100);
  });
});

describe("fileNameFrom", () => {
  it("decodes, trims and tolerates rubbish", () => {
    expect(fileNameFrom("My%20File.docx")).toBe("My File.docx");
    expect(fileNameFrom(["a.docx", "b.docx"])).toBe("a.docx");
    expect(fileNameFrom("%E0%A4%A")).toBe("%E0%A4%A"); // ghalat encoding: jaisa hai waisa
    expect(fileNameFrom(undefined)).toBe("");
    expect(fileNameFrom("x".repeat(400)).length).toBe(255);
  });
});

describe("office handler", () => {
  it("converts and sends the PDF with safe headers", async () => {
    const convert = vi.fn(async () => PDF);
    const out = await run("word", [DOCX], { "x-file-name": "Report.docx", "content-length": String(DOCX.length) }, convert);
    expect(out.status).toBe(200);
    expect(out.body).toEqual(PDF);
    expect(out.headers["Content-Type"]).toBe("application/pdf");
    expect(out.headers["Content-Length"]).toBe(String(PDF.length));
    expect(out.headers["Cache-Control"]).toBe("no-store");
    expect(out.headers["X-Content-Type-Options"]).toBe("nosniff");
    expect(convert).toHaveBeenCalledTimes(1);
    const [input, ext] = convert.mock.calls[0] as unknown as [Buffer, string];
    expect(input.equals(DOCX)).toBe(true);
    expect(ext).toBe("docx");
  });
  it("refuses a wrong file type before converting", async () => {
    const convert = vi.fn(async () => PDF);
    const out = await run("excel", [DOCX], { "x-file-name": "a.docx" }, convert);
    expect(out.error).toBeInstanceOf(AppError);
    expect((out.error as AppError).statusCode).toBe(415);
    expect(convert).not.toHaveBeenCalled();
  });
  it("refuses an empty body and a missing name", async () => {
    const convert = vi.fn(async () => PDF);
    expect(((await run("word", [], { "x-file-name": "a.docx" }, convert)).error as AppError).code).toBe("EMPTY_FILE");
    expect(((await run("word", [DOCX], {}, convert)).error as AppError).code).toBe("UNSUPPORTED_FILE");
    expect(convert).not.toHaveBeenCalled();
  });
  it("refuses a too-large file from the declared length, without reading it", async () => {
    const convert = vi.fn(async () => PDF);
    const out = await run("word", [DOCX], { "x-file-name": "a.docx", "content-length": String(MAX_OFFICE_BYTES + 1) }, convert);
    expect((out.error as AppError).statusCode).toBe(413);
    expect(out.headers.Connection).toBe("close");
    expect(convert).not.toHaveBeenCalled();
  });
  it("passes converter errors on to the error handler", async () => {
    const failure = new AppError(422, "CONVERT_FAILED", "nope");
    const out = await run("word", [DOCX], { "x-file-name": "a.docx" }, async () => {
      throw failure;
    });
    expect(out.error).toBe(failure);
  });
});