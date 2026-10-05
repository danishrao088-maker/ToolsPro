import request from "supertest";
import { describe, expect, it } from "vitest";
import { app } from "../src/app";
import { tools } from "../src/data/tools";


describe("GET /api/tools", () => {
  it("returns only active tools", async () => {
    const res = await request(app).get("/api/tools");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    // Public list mein wohi tools hon jo registry mein active hain, na kam na zyada
    const slugs = (res.body.data as { slug: string }[]).map((t) => t.slug).sort();
    const expected = tools.filter((t) => t.status === "active").map((t) => t.slug).sort();
    expect(slugs).toEqual(expected);
    expect(slugs).toHaveLength(19);
  });
  it("returns only active tools, without internal fields", async () => {
    const activeSlugs = new Set(tools.filter((t) => t.status === "active").map((t) => t.slug));
    const res = await request(app).get("/api/tools");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(activeSlugs.size);
    for (const t of res.body.data as Record<string, unknown>[]) {
      expect(activeSlugs.has(t.slug as string)).toBe(true);
      expect(t).not.toHaveProperty("status");
      expect(t).not.toHaveProperty("auditGroup");
      expect(t).not.toHaveProperty("reviewNote");
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