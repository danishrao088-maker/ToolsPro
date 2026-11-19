import { describe, expect, it, vi } from "vitest";
import { createGeoIpHandler } from "../src/controllers/webToolController";
import { AppError } from "../src/utils/AppError";

function run(body: unknown, ip: string | undefined, lookup: (input: string, clientIp: string) => Promise<unknown>) {
  const handler = createGeoIpHandler({ lookup });
  return new Promise<{ json?: unknown; error?: unknown }>((resolve) => {
    const req = { body, ip } as never;
    const res = { json: (value: unknown) => resolve({ json: value }) } as never;
    handler(req, res, (error?: unknown) => resolve({ error }));
  });
}

describe("geo ip handler", () => {
  it("passes the typed value and the client address to the service", async () => {
    const lookup = vi.fn(async () => ({ found: true }));
    expect(await run({ url: "8.8.8.8" }, "1.2.3.4", lookup)).toEqual({ json: { success: true, data: { found: true } } });
    expect(lookup).toHaveBeenCalledWith("8.8.8.8", "1.2.3.4");
  });
  it("allows an empty value, which means the visitor's own address", async () => {
    const lookup = vi.fn(async () => ({ found: true }));
    await run({ url: "" }, "5.6.7.8", lookup);
    expect(lookup).toHaveBeenCalledWith("", "5.6.7.8");
  });
  it("uses an empty client address when the request has none", async () => {
    const lookup = vi.fn(async () => ({}));
    await run({ url: "" }, undefined, lookup);
    expect(lookup).toHaveBeenCalledWith("", "");
  });
  it("rejects a missing or non-text value", async () => {
    for (const body of [undefined, null, {}, { url: 5 }, { url: null }]) {
      const out = await run(body, "1.2.3.4", async () => ({}));
      expect(out.error).toBeInstanceOf(AppError);
      expect((out.error as AppError).statusCode).toBe(400);
    }
  });
  it("hands service errors to the error handler", async () => {
    const failure = new AppError(503, "GEOIP_UNAVAILABLE", "down");
    const out = await run({ url: "8.8.8.8" }, "1.2.3.4", async () => { throw failure; });
    expect(out.error).toBe(failure);
  });
});