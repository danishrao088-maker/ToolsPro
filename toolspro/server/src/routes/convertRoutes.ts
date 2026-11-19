import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import { excelToPdf, powerpointToPdf, wordToPdf } from "../controllers/convertController";
import { AppError } from "../utils/AppError";

// Conversion bhaari kaam hai, is liye limit sakht: ek IP se 10 minute mein 10 files.
const convertLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, _res, next) => next(new AppError(429, "RATE_LIMITED", "Too many conversions from this connection. Please wait a few minutes and try again.")),
});

export const convertRouter = Router();
convertRouter.post("/word-to-pdf", convertLimiter, wordToPdf);
convertRouter.post("/excel-to-pdf", convertLimiter, excelToPdf);
convertRouter.post("/powerpoint-to-pdf", convertLimiter, powerpointToPdf);