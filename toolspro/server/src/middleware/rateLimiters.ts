import rateLimit from "express-rate-limit";
import { env } from "../config/env";

export function createLimiter(
  limit: number,
  windowMs: number,
  skipInTest = false,
  message = "Too many messages. Please try again in a few minutes."
) {
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
          message,
        },
      });
    },
  });
}

export const contactLimiter = createLimiter(5, 15 * 60 * 1000, true);

const CHECK_MESSAGE = "Too many checks. Please wait a few minutes and try again.";
export const webToolLimiter = createLimiter(30, 10 * 60 * 1000, true, CHECK_MESSAGE);
export const pingLimiter = createLimiter(6, 10 * 60 * 1000, true, CHECK_MESSAGE);