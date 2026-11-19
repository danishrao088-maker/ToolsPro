import { AppError } from "../utils/AppError";
import { asyncHandler } from "../utils/asyncHandler";
import { buildClearCookie, buildSessionCookie } from "../services/adminSession";

export interface AdminAuthApi {
  login(email: unknown, password: unknown): Promise<{ token: string; admin: { email: string } }>;
}

export function createAdminAuthHandlers(service: AdminAuthApi, options: { secureCookie: boolean }) {
  // POST /api/admin/login  { "email": "...", "password": "..." }
  const login = asyncHandler(async (req, res) => {
    const body = req.body as { email?: unknown; password?: unknown } | null | undefined;
    const { token, admin } = await service.login(body?.email, body?.password);
    res.setHeader("Set-Cookie", buildSessionCookie(token, options.secureCookie));
    res.json({ success: true, data: { email: admin.email } });
  });

  // POST /api/admin/logout
  const logout = asyncHandler(async (_req, res) => {
    res.setHeader("Set-Cookie", buildClearCookie(options.secureCookie));
    res.json({ success: true, data: { signedOut: true } });
  });

  // GET /api/admin/me  (requireAdmin ke baad)
  const me = asyncHandler(async (_req, res) => {
    const admin = res.locals.admin as { email?: unknown } | undefined;
    if (!admin || typeof admin.email !== "string") throw new AppError(401, "UNAUTHORIZED", "Please sign in to continue.");
    res.json({ success: true, data: { email: admin.email } });
  });

  return { login, logout, me };
}