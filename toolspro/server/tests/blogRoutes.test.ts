import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../src/services/adminAuthDefault", async () => {
  const { createRequireAdmin } = await import("../src/middleware/adminGuard");
  const adminAuthService = { login: vi.fn(), authenticate: vi.fn() };
  return { adminAuthService, requireAdmin: createRequireAdmin(adminAuthService) };
});

vi.mock("../src/services/blogDefault", () => {
  const terms = () => ({ list: vi.fn(), listPublic: vi.fn(), create: vi.fn(), update: vi.fn(), remove: vi.fn() });
  return {
    postService: {
      create: vi.fn(),
      update: vi.fn(),
      setStatus: vi.fn(),
      remove: vi.fn(),
      get: vi.fn(),
      list: vi.fn(),
      stats: vi.fn(),
      listPublished: vi.fn(),
      getPublished: vi.fn(),
    },
    categoryService: terms(),
    tagService: terms(),
  };
});

import { app } from "../src/app";
import { adminAuthService } from "../src/services/adminAuthDefault";
import { categoryService, postService, tagService } from "../src/services/blogDefault";

const authenticate = vi.mocked(adminAuthService.authenticate);
const COOKIE = "toolspro_admin=tok.en";
const ID = "65a000000000000000000001";

beforeEach(() => {
  vi.clearAllMocks();
  authenticate.mockResolvedValue({ id: "1", email: "owner@example.com" });
});

describe("public blog API", () => {
  it("lists published posts with a short cache time", async () => {
    vi.mocked(postService.listPublished).mockResolvedValue({ items: [], page: 1 } as never);
    const res = await request(app).get("/api/blog/posts?page=2&category=news");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, data: { items: [], page: 1 } });
    expect(res.headers["cache-control"]).toBe("public, max-age=60");
    expect(postService.listPublished).toHaveBeenCalledWith({ page: "2", category: "news" });
  });

  it("returns one post by slug", async () => {
    vi.mocked(postService.getPublished).mockResolvedValue({ slug: "hello" } as never);
    const res = await request(app).get("/api/blog/posts/hello");
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ slug: "hello" });
    expect(postService.getPublished).toHaveBeenCalledWith("hello");
  });

  it("lists categories and tags", async () => {
    vi.mocked(categoryService.listPublic).mockResolvedValue([{ slug: "news" }] as never);
    vi.mocked(tagService.listPublic).mockResolvedValue([{ slug: "ai" }] as never);
    expect((await request(app).get("/api/blog/categories")).body.data).toEqual([{ slug: "news" }]);
    expect((await request(app).get("/api/blog/tags")).body.data).toEqual([{ slug: "ai" }]);
  });

  it("does not need a sign-in, and does not accept writes", async () => {
    vi.mocked(postService.listPublished).mockResolvedValue({ items: [] } as never);
    expect((await request(app).get("/api/blog/posts")).status).toBe(200);
    expect(authenticate).not.toHaveBeenCalled();
    expect((await request(app).post("/api/blog/posts").send({ title: "x" })).status).toBe(404);
    expect(postService.create).not.toHaveBeenCalled();
  });
});

describe("admin API needs a sign-in", () => {
  it("refuses every admin blog route without a session", async () => {
    authenticate.mockResolvedValue(null);
    const attempts = [
      request(app).get("/api/admin/posts"),
      request(app).post("/api/admin/posts").send({ title: "x" }),
      request(app).put(`/api/admin/posts/${ID}`).send({ title: "x" }),
      request(app).patch(`/api/admin/posts/${ID}/status`).send({ status: "published" }),
      request(app).delete(`/api/admin/posts/${ID}`),
      request(app).get("/api/admin/stats"),
      request(app).get("/api/admin/categories"),
      request(app).post("/api/admin/tags").send({ name: "x" }),
    ];
    for (const res of await Promise.all(attempts)) {
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe("UNAUTHORIZED");
    }
    expect(postService.create).not.toHaveBeenCalled();
    expect(postService.remove).not.toHaveBeenCalled();
    expect(tagService.create).not.toHaveBeenCalled();
  });
});

describe("admin posts", () => {
  it("lists, reads, creates, updates, changes status and deletes", async () => {
    vi.mocked(postService.list).mockResolvedValue({ items: [] } as never);
    vi.mocked(postService.get).mockResolvedValue({ id: ID } as never);
    vi.mocked(postService.create).mockResolvedValue({ id: ID } as never);
    vi.mocked(postService.update).mockResolvedValue({ id: ID, updated: true } as never);
    vi.mocked(postService.setStatus).mockResolvedValue({ id: ID, status: "published" } as never);
    vi.mocked(postService.remove).mockResolvedValue(undefined as never);

    expect((await request(app).get("/api/admin/posts?status=draft").set("Cookie", COOKIE)).body.data).toEqual({ items: [] });
    expect(postService.list).toHaveBeenCalledWith({ status: "draft" });
    expect((await request(app).get(`/api/admin/posts/${ID}`).set("Cookie", COOKIE)).body.data).toEqual({ id: ID });

    const created = await request(app).post("/api/admin/posts").set("Cookie", COOKIE).send({ title: "T" });
    expect(created.status).toBe(201);
    expect(postService.create).toHaveBeenCalledWith({ title: "T" });

    const updated = await request(app).put(`/api/admin/posts/${ID}`).set("Cookie", COOKIE).send({ title: "T2" });
    expect(updated.status).toBe(200);
    expect(postService.update).toHaveBeenCalledWith(ID, { title: "T2" });

    const status = await request(app).patch(`/api/admin/posts/${ID}/status`).set("Cookie", COOKIE).send({ status: "published" });
    expect(status.body.data).toEqual({ id: ID, status: "published" });
    expect(postService.setStatus).toHaveBeenCalledWith(ID, "published");

    const deleted = await request(app).delete(`/api/admin/posts/${ID}`).set("Cookie", COOKIE);
    expect(deleted.body).toEqual({ success: true, data: { deleted: true } });
    expect(postService.remove).toHaveBeenCalledWith(ID);
  });

  it("accepts a long article, far above the 10 kb limit of other routes", async () => {
    vi.mocked(postService.create).mockResolvedValue({ id: ID } as never);
    const contentHtml = `<p>${"word ".repeat(20_000)}</p>`; // takreeban 100 kb
    const res = await request(app).post("/api/admin/posts").set("Cookie", COOKIE).send({ title: "Long", contentHtml });
    expect(res.status).toBe(201);
    expect(vi.mocked(postService.create).mock.calls[0]![0]).toMatchObject({ contentHtml });
  });

  it("refuses a body over 1 mb", async () => {
    const res = await request(app).post("/api/admin/posts").set("Cookie", COOKIE).send({ title: "Huge", contentHtml: "x".repeat(1_200_000) });
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(postService.create).not.toHaveBeenCalled();
  });

  it("refuses a change that comes from another website", async () => {
    const res = await request(app).post("/api/admin/posts").set("Cookie", COOKIE).set("Origin", "https://evil.example").send({ title: "x" });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("FORBIDDEN_ORIGIN");
    expect(postService.create).not.toHaveBeenCalled();
  });

  it("returns the stats", async () => {
    vi.mocked(postService.stats).mockResolvedValue({ totals: { posts: 3 } } as never);
    expect((await request(app).get("/api/admin/stats").set("Cookie", COOKIE)).body.data).toEqual({ totals: { posts: 3 } });
  });
});

describe("admin categories and tags", () => {
  it("manages categories", async () => {
    vi.mocked(categoryService.list).mockResolvedValue([{ id: ID }] as never);
    vi.mocked(categoryService.create).mockResolvedValue({ id: ID } as never);
    vi.mocked(categoryService.update).mockResolvedValue({ id: ID } as never);
    vi.mocked(categoryService.remove).mockResolvedValue(undefined as never);
    expect((await request(app).get("/api/admin/categories").set("Cookie", COOKIE)).body.data).toEqual([{ id: ID }]);
    expect((await request(app).post("/api/admin/categories").set("Cookie", COOKIE).send({ name: "News" })).status).toBe(201);
    expect(categoryService.create).toHaveBeenCalledWith({ name: "News" });
    await request(app).put(`/api/admin/categories/${ID}`).set("Cookie", COOKIE).send({ name: "N" });
    expect(categoryService.update).toHaveBeenCalledWith(ID, { name: "N" });
    expect((await request(app).delete(`/api/admin/categories/${ID}`).set("Cookie", COOKIE)).body.data).toEqual({ deleted: true });
    expect(categoryService.remove).toHaveBeenCalledWith(ID);
  });

  it("manages tags with their own service", async () => {
    vi.mocked(tagService.create).mockResolvedValue({ id: ID } as never);
    expect((await request(app).post("/api/admin/tags").set("Cookie", COOKIE).send({ name: "AI" })).status).toBe(201);
    expect(tagService.create).toHaveBeenCalledWith({ name: "AI" });
    expect(categoryService.create).not.toHaveBeenCalled();
  });

  it("keeps the small body limit for these routes", async () => {
    const res = await request(app).post("/api/admin/categories").set("Cookie", COOKIE).send({ name: "x", description: "y".repeat(20_000) });
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(categoryService.create).not.toHaveBeenCalled();
  });
});