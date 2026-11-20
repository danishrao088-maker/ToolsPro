import express from "express";
import { AppError } from "../utils/AppError";
import { asyncHandler } from "../utils/asyncHandler";
import { MAX_UPLOAD_BYTES, UPLOAD_MIME_TYPES, type UploadService } from "../services/uploadService";

// Image ko seedha bytes ki tarah bhejte hain (Content-Type: image/png...), koi multipart library nahi chahiye.
// Asli naam header X-File-Name mein (URL-encoded) aata hai.
export const uploadBody = express.raw({ type: UPLOAD_MIME_TYPES, limit: MAX_UPLOAD_BYTES });

export function createUploadHandler(service: Pick<UploadService, "save">) {
  // POST /api/admin/uploads
  return asyncHandler(async (req, res) => {
    if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
      throw new AppError(415, "UNSUPPORTED_TYPE", "Send the picture as JPG, PNG, GIF or WebP.");
    }
    let name = "";
    const header = req.get("x-file-name");
    if (header) {
      try {
        name = decodeURIComponent(header).slice(0, 200);
      } catch {
        name = "";
      }
    }
    res.status(201).json({ success: true, data: await service.save(req.body, name) });
  });
}
