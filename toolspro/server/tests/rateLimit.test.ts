import express from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { createLimiter } from "../src/middleware/rateLimiters";

describe("createLimiter", () => {
  it("blocks requests over the limit with 429", async () => {
    const app = express();
    app.get("/ping", createLimiter(2, 60_000), (_req, res) => {
      res.json({ ok: true });
    });

    expect((await request(app).get("/ping")).status).toBe(200);
    expect((await request(app).get("/ping")).status).toBe(200);

    const blocked = await request(app).get("/ping");
    expect(blocked.status).toBe(429);
    expect(blocked.body.error.code).toBe("TOO_MANY_REQUESTS");
  });
});