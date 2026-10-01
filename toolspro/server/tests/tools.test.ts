import request from "supertest";
import { describe, expect, it } from "vitest";
import { app } from "../src/app";

describe("GET /api/tools", () => {
  it("returns only active tools", async () => {
    const res = await request(app).get("/api/tools");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    for (const t of res.body.data as { status: string }[]) {
      expect(t.status).toBe("active");
    }
  });

  it("filters by a valid category", async () => {
    const res = await request(app).get("/api/tools?category=text-tools");
    expect(res.status).toBe(200);
    for (const t of res.body.data as { category: string }[]) {
      expect(t.category).toBe("text-tools");
    }
  });

  it("rejects an unknown category", async () => {
    const res = await request(app).get("/api/tools?category=abc");
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("INVALID_QUERY");
  });
});

describe("GET /api/categories", () => {
  it("returns all categories with derived counts", async () => {
    const res = await request(app).get("/api/categories");
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(6);
    for (const c of res.body.data as { toolCount: unknown }[]) {
      expect(typeof c.toolCount).toBe("number");
    }
  });
});