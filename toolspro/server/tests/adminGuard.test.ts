import { describe, expect, it, vi } from "vitest";
import { createRequireAdmin, noStore, requireSameOrigin } from "../src/middleware/adminGuard";
import { SESSION_COOKIE } from "../src/services/adminSession";
import { AppError } from "../src/utils/AppError";

function run(handler: (req: never, res: never, next: (error?: unknown) => void) => unknown, req: Record<string, unknown>) {
  return new Promise<{ error?: unknown; locals: Record<string, unknown>; headers: Record<string, string>; passed: boolean }>((resolve) => {
    const locals: Record<string, unknown> = {};
    const headers: Record<string, string> = {};
    const res = { locals, set: (name: string, value: string) => (headers[name] = value) };
    handler(req as never, res as never, (error?: unknown) => resolve({ error, locals, headers, passed: error === undefined }));
  });
}

describe("createRequireAdmin", () => {
  it("lets a signed-in admin through and remembers who it is", async () => {
    const authenticate = vi.fn(async () => ({ id: "1", email: "owner@example.com" }));
    const out = await run(createRequireAdmin({ authenticate }), { headers: { cookie: `x=1; ${SESSION_COOKIE}=the.token` } });
    expect(out.passed).toBe(true);
    expect(out.locals.admin).toEqual({ id: "1", email: "owner@example.com" });
    expect(authenticate).toHaveBeenCalledWith("the.token");
  });
  it("answers 401 when there is no cookie or the token is not accepted", async () => {
    const authenticate = vi.fn(async () => null);
    for (const headers of [{}, { cookie: "other=1" }, { cookie: `${SESSION_COOKIE}=bad` }]) {
      const out = await run(createRequireAdmin({ authenticate }), { headers });
      expect(out.error).toBeInstanceOf(AppError);
      expect(out.error).toMatchObject({ statusCode: 401, code: "UNAUTHORIZED" });
      expect(out.locals.admin).toBeUndefined();
    }
  });
  it("passes service errors on", async () => {
    const failure = new AppError(503, "DB_UNAVAILABLE", "down");
    const out = await run(
      createRequireAdmin({
        authenticate: async () => {
          throw failure;
        },
      }),
      { headers: { cookie: `${SESSION_COOKIE}=tok` } }
    );
    expect(out.error).toBe(failure);
  });
});

describe("requireSameOrigin", () => {
  const guard = requireSameOrigin(["http://localhost:5173", "https://toolspro.example"]);
  const request = (method: string, origin?: string) => ({ method, get: (name: string) => (name === "origin" ? origin : undefined) });

  it("lets changes from our own origins through", async () => {
    expect((await run(guard, request("POST", "http://localhost:5173"))).passed).toBe(true);
    expect((await run(guard, request("DELETE", "https://toolspro.example"))).passed).toBe(true);
  });
  it("refuses changes from another origin", async () => {
    for (const origin of ["https://evil.example", "http://localhost:5173.evil.example", "null"]) {
      const out = await run(guard, request("POST", origin));
      expect(out.error).toMatchObject({ statusCode: 403, code: "FORBIDDEN_ORIGIN" });
    }
  });
  it("does not block reads, or requests that carry no Origin header", async () => {
    expect((await run(guard, request("GET", "https://evil.example"))).passed).toBe(true);
    expect((await run(guard, request("POST", undefined))).passed).toBe(true);
  });
});

describe("noStore", () => {
  it("marks the answer as not cacheable", async () => {
    const out = await run(noStore, {});
    expect(out.passed).toBe(true);
    expect(out.headers["Cache-Control"]).toBe("no-store");
  });
});