import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import { env } from "../config/env";
import { createAdminAuthHandlers } from "../controllers/adminAuthController";
import { noStore, requireSameOrigin } from "../middleware/adminGuard";
import { adminAuthService, requireAdmin } from "../services/adminAuthDefault";
import { AppError } from "../utils/AppError";
import { adminBlogRouter } from "./adminBlogRoutes";

// Login par andaza lagane (brute force) se bachao: ek IP se 15 minute me 10 koshishein
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, _res, next) => next(new AppError(429, "RATE_LIMITED", "Too many sign-in attempts. Please try again later.")),
});

const { login, logout, me } = createAdminAuthHandlers(adminAuthService, { secureCookie: env.NODE_ENV === "production" });

export const adminRouter = Router(); // /api/admin
adminRouter.use(noStore, requireSameOrigin(env.CLIENT_ORIGINS));
adminRouter.post("/login", loginLimiter, login);
adminRouter.post("/logout", logout);
adminRouter.get("/me", requireAdmin, me);
// Iske neeche sab kuch sirf login wale admin ke liye hai
adminRouter.use(requireAdmin, adminBlogRouter);