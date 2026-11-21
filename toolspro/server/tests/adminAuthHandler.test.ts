import { describe, expect, it, vi } from "vitest";
import { createAdminAuthHandlers, type AdminAuthApi } from "../src/controllers/adminAuthController";
import { SESSION_COOKIE } from "../src/services/adminSession";
import { AppError } from "../src/utils/AppError";

interface Out {
  json?: unknown;
  cookie?: string;
  error?: unknown;
}

function call(handler: (req: never, res: never, next: (error?: unknown) => void) => unknown, req: Record<string, unknown>, locals: Record<string, unknown> = {}) {
  return new Promise<Out>((resolve) => {
    const out: Out = {};
    const res = {
      locals,
      setHeader: (name: string, value: string) => {
        if (name === "Set-Cookie") out.cookie = value;
      },
      json: (value: unknown) => resolve({ ...out, json: value }),
    };
    handler(req as never, res as never, (error?: unknown) => resolve({ ...out, error }));
  });
}

const api = (overrides: Partial<AdminAuthApi> = {}): AdminAuthApi => ({
  login: vi.fn(async () => ({ token: "tok.en", admin: { email: "owner@example.com" } })),
  ...overrides,
});

describe("login", () => {
  it("sets the session cookie and returns only the email", async () => {
    const service = api();
    const out = await call(createAdminAuthHandlers(service, { secureCookie: false }).login, { body: { email: "owner@example.com", password: "secret pass 1" } });
    expect(out.json).toEqual({ success: true, data: { email: "owner@example.com" } });
    expect(out.cookie).toContain(`${SESSION_COOKIE}=tok.en`);
    expect(out.cookie).toContain("HttpOnly");
    expect(out.cookie).not.toContain("Secure");
    expect(service.login).toHaveBeenCalledWith("owner@example.com", "secret pass 1");
  });
  it("adds Secure to the cookie when asked", async () => {
    const out = await call(createAdminAuthHandlers(api(), { secureCookie: true }).login, { body: { email: "a@b.co", password: "x" } });
    expect(out.cookie).toContain("; Secure");
  });
  it("never puts the token in the JSON body", async () => {
    const out = await call(createAdminAuthHandlers(api(), { secureCookie: false }).login, { body: { email: "a@b.co", password: "x" } });
    expect(JSON.stringify(out.json)).not.toContain("tok.en");
  });
  it("passes a missing body to the service, which rejects it", async () => {
    const failure = new AppError(400, "VALIDATION_ERROR", "Enter your email and password.");
    const service = api({
      login: async () => {
        throw failure;
      },
    });
    for (const body of [undefined, null, {}]) {
      const out = await call(createAdminAuthHandlers(service, { secureCookie: false }).login, { body });
      expect(out.error).toBe(failure);
      expect(out.cookie).toBeUndefined();
    }
  });
});

describe("logout", () => {
  it("clears the cookie", async () => {
    const out = await call(createAdminAuthHandlers(api(), { secureCookie: true }).logout, {});
    expect(out.json).toEqual({ success: true, data: { signedOut: true } });
    expect(out.cookie).toContain("Max-Age=0");
  });
});

describe("me", () => {
  it("returns the signed-in admin's email", async () => {
    const out = await call(createAdminAuthHandlers(api(), { secureCookie: false }).me, {}, { admin: { id: "1", email: "owner@example.com" } });
    expect(out.json).toEqual({ success: true, data: { email: "owner@example.com" } });
  });
  it("answers 401 when the guard did not run", async () => {
    const out = await call(createAdminAuthHandlers(api(), { secureCookie: false }).me, {}, {});
    expect(out.error).toMatchObject({ statusCode: 401 });
  });
});