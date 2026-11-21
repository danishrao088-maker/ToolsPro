import { describe, expect, it, vi } from "vitest";
import { createShortUrlHandlers, type ShortUrlApi } from "../src/controllers/shortUrlController";
import { AppError } from "../src/utils/AppError";

interface Out {
  status?: number;
  headers: Record<string, string>;
  json?: unknown;
  html?: string;
  redirect?: { status: number; url: string };
  error?: unknown;
}

function call(handler: (req: never, res: never, next: (error?: unknown) => void) => unknown, req: Record<string, unknown>) {
  return new Promise<Out>((resolve) => {
    const out: Out = { headers: {} };
    const res = {
      status: (code: number) => {
        out.status = code;
        return res;
      },
      set: (headers: Record<string, string>) => {
        Object.assign(out.headers, headers);
        return res;
      },
      type: () => res,
      json: (value: unknown) => resolve({ ...out, json: value }),
      send: (html: string) => resolve({ ...out, html }),
      redirect: (status: number, url: string) => resolve({ ...out, redirect: { status, url } }),
    };
    handler(req as never, res as never, (error?: unknown) => resolve({ ...out, error }));
  });
}

const api = (overrides: Partial<ShortUrlApi> = {}): ShortUrlApi => ({
  create: vi.fn(async () => ({ code: "abcd234" })),
  resolve: vi.fn(async () => "https://example.com/x"),
  ...overrides,
});

describe("createShortLink", () => {
  it("passes the address and this site's own host to the service", async () => {
    const service = api();
    const out = await call(createShortUrlHandlers(service).createShortLink, { body: { url: "example.com" }, hostname: "toolspro.com" });
    expect(out.status).toBe(201);
    expect(out.json).toEqual({ success: true, data: { code: "abcd234" } });
    expect(service.create).toHaveBeenCalledWith("example.com", ["toolspro.com"]);
  });
  it("rejects a missing or non-text address", async () => {
    for (const body of [undefined, null, {}, { url: 5 }, { url: null }, { url: ["a.com"] }]) {
      const service = api();
      const out = await call(createShortUrlHandlers(service).createShortLink, { body, hostname: "toolspro.com" });
      expect(out.error).toBeInstanceOf(AppError);
      expect((out.error as AppError).statusCode).toBe(400);
      expect(service.create).not.toHaveBeenCalled();
    }
  });
  it("hands service errors to the error handler", async () => {
    const failure = new AppError(400, "INVALID_URL", "nope");
    const service = api({
      create: async () => {
        throw failure;
      },
    });
    const out = await call(createShortUrlHandlers(service).createShortLink, { body: { url: "x.com" }, hostname: "h" });
    expect(out.error).toBe(failure);
  });
});

describe("followShortLink", () => {
  it("redirects with 302 and safe headers", async () => {
    const service = api();
    const out = await call(createShortUrlHandlers(service).followShortLink, { params: { code: "abcd234" } });
    expect(out.redirect).toEqual({ status: 302, url: "https://example.com/x" });
    expect(out.headers["Cache-Control"]).toBe("no-store");
    expect(out.headers["X-Robots-Tag"]).toBe("noindex, nofollow");
    expect(service.resolve).toHaveBeenCalledWith("abcd234");
  });
  it("shows a plain 404 page for an unknown or expired link", async () => {
    const out = await call(createShortUrlHandlers(api({ resolve: async () => null })).followShortLink, { params: { code: "nope234" } });
    expect(out.redirect).toBeUndefined();
    expect(out.status).toBe(404);
    expect(out.html).toContain("Link not found");
    expect(out.html).not.toContain("nope234"); // code page mein dobara nahi likhte
    expect(out.headers["X-Robots-Tag"]).toBe("noindex, nofollow");
  });
  it("never redirects to a stored address that is not http(s)", async () => {
    for (const bad of ["javascript:alert(1)", "data:text/html,x", "//evil.example", "ftp://x.com/"]) {
      const out = await call(createShortUrlHandlers(api({ resolve: async () => bad })).followShortLink, { params: { code: "abcd234" } });
      expect(out.redirect).toBeUndefined();
      expect(out.status).toBe(404);
    }
  });
  it("hands service errors (such as a database problem) to the error handler", async () => {
    const failure = new AppError(503, "DB_UNAVAILABLE", "down");
    const service = api({
      resolve: async () => {
        throw failure;
      },
    });
    const out = await call(createShortUrlHandlers(service).followShortLink, { params: { code: "abcd234" } });
    expect(out.error).toBe(failure);
  });
});