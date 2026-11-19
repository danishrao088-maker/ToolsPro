import type { RequestHandler } from "express";
import type { AdminIdentity } from "../services/adminAuthService";
import { readSessionCookie } from "../services/adminSession";
import { AppError } from "../utils/AppError";

export interface Authenticator {
  authenticate(token: string | undefined): Promise<AdminIdentity | null>;
}

// Sirf login wale admin ko aage jane deta hai. Admin ki pehchan res.locals.admin me rakhta hai.
export function createRequireAdmin(service: Authenticator): RequestHandler {
  return (req, res, next) => {
    service
      .authenticate(readSessionCookie(req.headers.cookie))
      .then((admin) => {
        if (!admin) {
          next(new AppError(401, "UNAUTHORIZED", "Please sign in to continue."));
          return;
        }
        res.locals.admin = admin;
        next();
      })
      .catch(next);
  };
}

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

// Doosri website se aayi hui badalne wali request (CSRF) roknay ke liye: Origin hamare allowed origins me hona chahiye.
export function requireSameOrigin(allowed: string[]): RequestHandler {
  return (req, _res, next) => {
    const origin = req.get("origin");
    if (SAFE_METHODS.has(req.method) || origin === undefined || allowed.includes(origin)) {
      next();
      return;
    }
    next(new AppError(403, "FORBIDDEN_ORIGIN", "This request was not allowed."));
  };
}

// Admin ke jawab browser ya proxy me cache na hon
export const noStore: RequestHandler = (_req, res, next) => {
  res.set("Cache-Control", "no-store");
  next();
};