import { mkdir, open } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import path from "node:path";
import { AppError } from "../utils/AppError";
import { slugify } from "./blogText";

// Admin se aayi image ko uploads folder mein rakhna. Sirf asli JPG/PNG/GIF/WebP; SVG aur baaqi sab refuse
// (SVG mein script ho sakti hai). File ki pehchan uske pehle bytes se hoti hai, naam ya declared type par bharosa nahi.

export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
export const UPLOAD_MIME_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];
export const UPLOAD_URL_PREFIX = "/wp-content/uploads";

export interface ImageKind {
  ext: "jpg" | "png" | "gif" | "webp";
  mime: string;
}

export function detectImage(data: Buffer): ImageKind | null {
  if (data.length >= 3 && data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff) return { ext: "jpg", mime: "image/jpeg" };
  if (data.length >= 8 && data.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return { ext: "png", mime: "image/png" };
  if (data.length >= 6 && (data.subarray(0, 6).toString("latin1") === "GIF87a" || data.subarray(0, 6).toString("latin1") === "GIF89a")) return { ext: "gif", mime: "image/gif" };
  if (data.length >= 12 && data.subarray(0, 4).toString("latin1") === "RIFF" && data.subarray(8, 12).toString("latin1") === "WEBP") return { ext: "webp", mime: "image/webp" };
  return null;
}

// "My Photo (1).JPG" -> "my-photo-1". Koi naam na bane to "image".
export function safeBaseName(original: string): string {
  const leaf = original.split(/[\\/]/).pop() ?? "";
  const withoutExt = leaf.replace(/\.[A-Za-z0-9]{1,5}$/, "");
  return slugify(withoutExt).slice(0, 60).replace(/-+$/g, "") || "image";
}

export interface UploadDeps {
  dir: string; // uploads folder (UPLOADS_DIR). Khali ho to upload band hai.
  now?: () => Date;
}

export interface UploadedImage {
  url: string;
  bytes: number;
  type: string;
}

export function createUploadService(deps: UploadDeps) {
  const now = deps.now ?? (() => new Date());

  async function save(data: Buffer, originalName: string): Promise<UploadedImage> {
    if (deps.dir === "") throw new AppError(503, "UPLOADS_NOT_CONFIGURED", "Picture uploads are not set up on this server.");
    if (data.length === 0) throw new AppError(400, "VALIDATION_ERROR", "No picture was received.");
    if (data.length > MAX_UPLOAD_BYTES) throw new AppError(413, "PAYLOAD_TOO_LARGE", "The picture is too large (8 MB at most).");
    const kind = detectImage(data);
    if (!kind) throw new AppError(400, "VALIDATION_ERROR", "Only JPG, PNG, GIF or WebP pictures can be uploaded.");

    const date = now();
    const year = String(date.getUTCFullYear());
    const month = String(date.getUTCMonth() + 1).padStart(2, "0");
    const folder = path.join(deps.dir, year, month);
    await mkdir(folder, { recursive: true });

    const base = safeBaseName(originalName);
    for (let attempt = 1; attempt <= 60; attempt += 1) {
      const suffix = attempt === 1 ? "" : attempt <= 50 ? `-${attempt}` : `-${randomBytes(3).toString("hex")}`;
      const fileName = `${base}${suffix}.${kind.ext}`;
      try {
        // "wx": pehle se maujood file kabhi overwrite nahi hoti
        const handle = await open(path.join(folder, fileName), "wx");
        try {
          await handle.writeFile(data);
        } finally {
          await handle.close();
        }
        return { url: `${UPLOAD_URL_PREFIX}/${year}/${month}/${fileName}`, bytes: data.length, type: kind.mime };
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === "EEXIST") continue;
        throw error;
      }
    }
    throw new AppError(503, "UPLOAD_FAILED", "The picture could not be saved. Please try again.");
  }

  return { save };
}

export type UploadService = ReturnType<typeof createUploadService>;
