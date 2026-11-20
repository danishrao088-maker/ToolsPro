import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../src/services/adminAuthDefault", async () => {
  const { createRequireAdmin } = await import("../src/middleware/adminGuard");
  const adminAuthService = { login: vi.fn(), authenticate: vi.fn() };
  return { adminAuthService, requireAdmin: createRequireAdmin(adminAuthService) };
});

import { app } from "../src/app";
import { adminAuthService } from "../src/services/adminAuthDefault";

const login = vi.mocked(adminAuthService.login);
const authenticate = vi.mocked(adminAuthService.authenticate);

describe("POST /api/admin/login", () => {
  beforeEach(() => {
    login.mockReset();
    login.mockResolvedValue({ token: "tok.en", admin: { email: "owner@example.com" } });
  });

  it("signs in and sets an HttpOnly cookie", async () => {
    const res = await request(app).post("/api/admin/login").send({ email: "owner@example.com", password: "secret pass 1" });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, data: { email: "owner@example.com" } });
    const cookie = String(res.headers["set-cookie"]);
    expect(cookie).toContain("toolspro_admin=tok.en");
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("SameSite=Strict");
    expect(res.headers["cache-control"]).toBe("no-store");
    expect(login).toHaveBeenCalledWith("owner@example.com", "secret pass 1");
  });

  it("refuses a request from another origin before looking at the password", async () => {
    const res = await request(app).post("/api/admin/login").set("Origin", "https://evil.example").send({ email: "owner@example.com", password: "x" });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("FORBIDDEN_ORIGIN");
    expect(login).not.toHaveBeenCalled();
  });
});

describe("GET /api/admin/me", () => {
  beforeEach(() => {
    authenticate.mockReset();
  });

  it("answers 401 without a session", async () => {
    authenticate.mockResolvedValue(null);
    const res = await request(app).get("/api/admin/me");
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHORIZED");
  });

  it("returns the admin with a valid session cookie", async () => {
    authenticate.mockResolvedValue({ id: "1", email: "owner@example.com" });
    const res = await request(app).get("/api/admin/me").set("Cookie", "toolspro_admin=tok.en");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, data: { email: "owner@example.com" } });
    expect(authenticate).toHaveBeenCalledWith("tok.en");
  });
});

describe("POST /api/admin/logout", () => {
  it("clears the cookie", async () => {
    const res = await request(app).post("/api/admin/logout");
    expect(res.status).toBe(200);
    expect(String(res.headers["set-cookie"])).toContain("Max-Age=0");
  });
});
describe("POST /api/admin/uploads", () => {
  beforeEach(() => {
    authenticate.mockReset();
  });

  it("needs a signed-in admin", async () => {
    authenticate.mockResolvedValue(null);
    const res = await request(app).post("/api/admin/uploads").set("Content-Type", "image/png").send(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0]));
    expect(res.status).toBe(401);
  });

  it("refuses an upload that comes from another website", async () => {
    authenticate.mockResolvedValue({ id: "1", email: "owner@example.com" });
    const res = await request(app).post("/api/admin/uploads").set("Origin", "https://evil.example").set("Content-Type", "image/png").send(Buffer.from([1, 2, 3]));
    expect(res.status).toBe(403);
  });

  it("tells a signed-in admin when pictures cannot be saved (no folder configured in tests)", async () => {
    authenticate.mockResolvedValue({ id: "1", email: "owner@example.com" });
    const res = await request(app)
      .post("/api/admin/uploads")
      .set("Cookie", "toolspro_admin=tok.en")
      .set("Content-Type", "image/png")
      .send(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0]));
    expect(res.status).toBe(503);
    expect(res.body.error.code).toBe("UPLOADS_NOT_CONFIGURED");
  });
});
