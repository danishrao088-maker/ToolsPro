import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import { createShortUrlHandlers } from "../controllers/shortUrlController";
import { shortUrlService } from "../services/shortUrlDefault";
import { AppError } from "../utils/AppError";

const limit = (windowMs: number, max: number, message: string) =>
  rateLimit({
    windowMs,
    limit: max,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (_req, _res, next) => next(new AppError(429, "RATE_LIMITED", message)),
  });

// Naya link banana: ek IP se ghante mein 10. Link kholna: ek IP se minute mein 120.
const createLimiter = limit(60 * 60 * 1000, 10, "You have created many short links recently. Please try again later.");
const followLimiter = limit(60 * 1000, 120, "Too many requests. Please slow down.");

const { createShortLink, followShortLink } = createShortUrlHandlers(shortUrlService);

export const shortApiRouter = Router(); // /api/short
shortApiRouter.post("/", createLimiter, createShortLink);

export const shortRedirectRouter = Router(); // /s
shortRedirectRouter.get("/:code", followLimiter, followShortLink);