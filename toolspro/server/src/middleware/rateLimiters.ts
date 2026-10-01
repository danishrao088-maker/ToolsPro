import rateLimit from "express-rate-limit";
import { env } from "../config/env";

export function createLimiter(limit: number, windowMs: number, skipInTest = false) {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: true,
    legacyHeaders: false,
    skip: () => skipInTest && env.NODE_ENV === "test",
    handler: (_req, res) => {
      res.status(429).json({
        success: false,
        error: {
          code: "TOO_MANY_REQUESTS",
          message: "Too many messages. Please try again in a few minutes.",
        },
      });
    },
  });
}

export const contactLimiter = createLimiter(5, 15 * 60 * 1000, true);