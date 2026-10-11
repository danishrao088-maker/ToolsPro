import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../src/services/webToolService", () => ({
  webToolService: {
    checkStatus: vi.fn(),
    checkRedirects: vi.fn(),
    checkDown: vi.fn(),
    ping: vi.fn(),
    analyzeMeta: vi.fn(),
    analyzeOpenGraph: vi.fn(),
    snoop: vi.fn(),
    seoScore: vi.fn(),
  },
}));

import { app } from "../src/app";
import { webToolService } from "../src/services/webToolService";
import { AppError } from "../src/utils/AppError";

const routes = [
  ["/api/web/status", "checkStatus"],
  ["/api/web/redirects", "checkRedirects"],
  ["/api/web/is-it-down", "checkDown"],
  ["/api/web/ping", "ping"],
  ["/api/web/meta", "analyzeMeta"],
  ["/api/web/open-graph", "analyzeOpenGraph"],
  ["/api/web/snoop", "snoop"],
  ["/api/web/seo-score", "seoScore"],
] as const;

describe.each(routes)("POST %s", (path, method) => {
  const mocked = vi.mocked(webToolService[method]);

  beforeEach(() => {
    mocked.mockReset();
    mocked.mockResolvedValue({ checked: true } as never);
  });

  it("passes the address to the service and wraps the answer", async () => {
    const res = await request(app).post(path).send({ url: "example.com" });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, data: { checked: true } });
    expect(mocked).toHaveBeenCalledWith("example.com");
  });

  it("rejects a missing or non-text address", async () => {
    for (const body of [{}, { url: 123 }, { url: null }, { url: ["a.com"] }]) {
      const res = await request(app).post(path).send(body);
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    }
    const noBody = await request(app).post(path);
    expect(noBody.status).toBe(400);
    expect(mocked).not.toHaveBeenCalled();
  });

  it("shows the error when the service refuses the address", async () => {
    mocked.mockRejectedValue(new AppError(400, "URL_NOT_ALLOWED", "This web address cannot be checked."));
    const res = await request(app).post(path).send({ url: "http://127.0.0.1" });
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ success: false, error: { code: "URL_NOT_ALLOWED", message: "This web address cannot be checked." } });
  });

  it("hides unexpected errors", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    mocked.mockRejectedValue(new TypeError("secret detail"));
    const res = await request(app).post(path).send({ url: "example.com" });
    expect(res.status).toBe(500);
    expect(res.body.error.code).toBe("INTERNAL_ERROR");
    expect(JSON.stringify(res.body)).not.toContain("secret detail");
    spy.mockRestore();
  });

  it("does not answer GET requests", async () => {
    const res = await request(app).get(path);
    expect(res.status).toBe(404);
  });
});
