import { asyncHandler } from "../utils/asyncHandler";
import { AppError } from "../utils/AppError";
import { checkOfficeFile, MAX_OFFICE_BYTES, type OfficeKind } from "../services/officeFormat";
import { officeConverter } from "../services/officeConvert";

// File raw bytes ki shakal mein aati hai (Content-Type: application/octet-stream), naam header X-File-Name mein.
// Body hum khud parhte hain taake hadd se bari file par saaf jawab (413) de saken.

const tooLarge = () => new AppError(413, "FILE_TOO_LARGE", `The file is too large. The maximum is ${MAX_OFFICE_BYTES / 1024 / 1024} MB.`);

export async function readBody(stream: AsyncIterable<unknown>, limit: number): Promise<Buffer> {
  const hardCap = limit * 2; // is se zyada bheje to parhna band (jhoota Content-Length / chunked bhejne wale)
  const chunks: Buffer[] = [];
  let total = 0;
  let over = false;
  for await (const chunk of stream) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk));
    total += buffer.length;
    if (total > hardCap) throw tooLarge();
    if (over) continue;
    if (total > limit) {
      over = true;
      chunks.length = 0;
    } else {
      chunks.push(buffer);
    }
  }
  if (over) throw tooLarge();
  return Buffer.concat(chunks, total);
}

export function fileNameFrom(header: string | string[] | undefined): string {
  const raw = Array.isArray(header) ? header[0] : header;
  if (!raw) return "";
  let name = raw;
  try {
    name = decodeURIComponent(raw);
  } catch {
    name = raw;
  }
  return name.slice(0, 255);
}

export interface OfficeService {
  convertToPdf(input: Buffer, ext: string): Promise<Buffer>;
}

export function createOfficeHandler(kind: OfficeKind, service: OfficeService) {
  return asyncHandler(async (req, res) => {
    const declared = Number(req.headers["content-length"]);
    if (Number.isFinite(declared) && declared > MAX_OFFICE_BYTES) {
      res.set("Connection", "close");
      throw tooLarge();
    }
    const body = await readBody(req, MAX_OFFICE_BYTES);
    const { ext } = checkOfficeFile(kind, body, fileNameFrom(req.headers["x-file-name"]));
    const pdf = await service.convertToPdf(body, ext);
    res.status(200);
    res.set({
      "Content-Type": "application/pdf",
      "Content-Length": String(pdf.length),
      "Content-Disposition": 'attachment; filename="converted.pdf"',
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    });
    res.send(pdf);
  });
}

export const wordToPdf = createOfficeHandler("word", officeConverter);
export const excelToPdf = createOfficeHandler("excel", officeConverter);
export const powerpointToPdf = createOfficeHandler("powerpoint", officeConverter);