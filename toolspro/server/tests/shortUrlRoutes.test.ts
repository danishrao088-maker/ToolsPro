import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../src/services/shortUrlDefault", () => ({
  shortUrlService: { create: vi.fn(), resolve: vi.fn() },
}));

import { app } from "../src/app";
import { shortUrlService } from "../src/services/shortUrlDefault";

const create = vi.mocked(shortUrlService.create);
const resolve = vi.mocked(shortUrlService.resolve);
const CREATED = { code: "abcd234", path: "/s/abcd234", destination: "https://example.com/", expiresAt: "2027-10-16T00:00:00.000Z" };

describe("POST /api/short", () => {
  beforeEach(() => {
    create.mockReset();
    create.mockResolvedValue(CREATED);
  });

  it("creates a short link", async () => {
    const res = await request(app).post("/api/short").send({ url: "example.com" });
    expect(res.status).toBe(201);
    expect(res.body).toEqual({ success: true, data: CREATED });
    expect(create).toHaveBeenCalledWith("example.com", [expect.any(String)]);
  });

  it("rejects a missing or non-text address", async () => {
    const res = await request(app).post("/api/short").send({ url: 5 });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
    expect(create).not.toHaveBeenCalled();
  });

  it("does not answer GET requests", async () => {
    const res = await request(app).get("/api/short");
    expect(res.status).toBe(404);
  });
});

describe("GET /s/:code", () => {
  beforeEach(() => {
    resolve.mockReset();
  });

  it("redirects to the stored address", async () => {
    resolve.mockResolvedValue("https://example.com/a-long-page?x=1");
    const res = await request(app).get("/s/abcd234");
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe("https://example.com/a-long-page?x=1");
    expect(res.headers["cache-control"]).toBe("no-store");
    expect(res.headers["x-robots-tag"]).toBe("noindex, nofollow");
    expect(resolve).toHaveBeenCalledWith("abcd234");
  });

  it("shows a plain 404 page for an unknown link", async () => {
    resolve.mockResolvedValue(null);
    const res = await request(app).get("/s/nope234");
    expect(res.status).toBe(404);
    expect(res.headers["content-type"]).toContain("text/html");
    expect(res.text).toContain("Link not found");
  });
});