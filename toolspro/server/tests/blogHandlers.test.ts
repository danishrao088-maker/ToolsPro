import { describe, expect, it, vi } from "vitest";
import {
  createAdminPostHandlers,
  createAdminTermHandlers,
  type AdminPostsApi,
  type AdminTermsApi,
} from "../src/controllers/adminBlogController";
import { createBlogHandlers } from "../src/controllers/blogController";
import { AppError } from "../src/utils/AppError";

interface Out {
  status?: number;
  headers: Record<string, string>;
  json?: unknown;
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
      set: (name: string, value: string) => {
        out.headers[name] = value;
        return res;
      },
      json: (value: unknown) => resolve({ ...out, json: value }),
    };
    handler(req as never, res as never, (error?: unknown) => resolve({ ...out, error }));
  });
}

const postsApi = (overrides: Partial<AdminPostsApi> = {}): AdminPostsApi => ({
  list: vi.fn(async () => ({ items: [] })),
  get: vi.fn(async () => ({ id: "1" })),
  create: vi.fn(async () => ({ id: "new" })),
  update: vi.fn(async () => ({ id: "1", updated: true })),
  setStatus: vi.fn(async () => ({ id: "1", status: "published" })),
  remove: vi.fn(async () => undefined),
  stats: vi.fn(async () => ({ totals: {} })),
  ...overrides,
});

describe("admin post handlers", () => {
  it("lists with the query string", async () => {
    const service = postsApi();
    const out = await call(createAdminPostHandlers(service).listPosts, { query: { page: "2" } });
    expect(out.json).toEqual({ success: true, data: { items: [] } });
    expect(service.list).toHaveBeenCalledWith({ page: "2" });
  });
  it("gets one by id", async () => {
    const service = postsApi();
    const out = await call(createAdminPostHandlers(service).getPost, { params: { id: "abc" } });
    expect(out.json).toEqual({ success: true, data: { id: "1" } });
    expect(service.get).toHaveBeenCalledWith("abc");
  });
  it("creates with 201", async () => {
    const service = postsApi();
    const out = await call(createAdminPostHandlers(service).createPost, { body: { title: "T" } });
    expect(out.status).toBe(201);
    expect(out.json).toEqual({ success: true, data: { id: "new" } });
    expect(service.create).toHaveBeenCalledWith({ title: "T" });
  });
  it("updates by id", async () => {
    const service = postsApi();
    const out = await call(createAdminPostHandlers(service).updatePost, { params: { id: "abc" }, body: { title: "T" } });
    expect(out.json).toEqual({ success: true, data: { id: "1", updated: true } });
    expect(service.update).toHaveBeenCalledWith("abc", { title: "T" });
  });
  it("changes the status, also with a missing body", async () => {
    const service = postsApi();
    const handler = createAdminPostHandlers(service).setPostStatus;
    expect((await call(handler, { params: { id: "abc" }, body: { status: "published" } })).json).toEqual({ success: true, data: { id: "1", status: "published" } });
    expect(service.setStatus).toHaveBeenLastCalledWith("abc", "published");
    await call(handler, { params: { id: "abc" }, body: undefined });
    expect(service.setStatus).toHaveBeenLastCalledWith("abc", undefined);
  });
  it("deletes and confirms", async () => {
    const service = postsApi();
    const out = await call(createAdminPostHandlers(service).deletePost, { params: { id: "abc" } });
    expect(out.json).toEqual({ success: true, data: { deleted: true } });
    expect(service.remove).toHaveBeenCalledWith("abc");
  });
  it("returns the dashboard numbers", async () => {
    const out = await call(createAdminPostHandlers(postsApi()).stats, {});
    expect(out.json).toEqual({ success: true, data: { totals: {} } });
  });
  it("hands service errors to the error handler", async () => {
    const failure = new AppError(404, "NOT_FOUND", "That post was not found.");
    const service = postsApi({
      get: async () => {
        throw failure;
      },
      remove: async () => {
        throw failure;
      },
    });
    const handlers = createAdminPostHandlers(service);
    expect((await call(handlers.getPost, { params: { id: "x" } })).error).toBe(failure);
    expect((await call(handlers.deletePost, { params: { id: "x" } })).error).toBe(failure);
  });
});

describe("admin term handlers", () => {
  const termsApi = (): AdminTermsApi => ({
    list: vi.fn(async () => [{ id: "1" }]),
    create: vi.fn(async () => ({ id: "new" })),
    update: vi.fn(async () => ({ id: "1" })),
    remove: vi.fn(async () => undefined),
  });
  it("lists, creates with 201, updates and deletes", async () => {
    const service = termsApi();
    const handlers = createAdminTermHandlers(service);
    expect((await call(handlers.list, {})).json).toEqual({ success: true, data: [{ id: "1" }] });
    const created = await call(handlers.create, { body: { name: "News" } });
    expect(created.status).toBe(201);
    expect(service.create).toHaveBeenCalledWith({ name: "News" });
    await call(handlers.update, { params: { id: "abc" }, body: { name: "N" } });
    expect(service.update).toHaveBeenCalledWith("abc", { name: "N" });
    expect((await call(handlers.remove, { params: { id: "abc" } })).json).toEqual({ success: true, data: { deleted: true } });
  });
});

describe("public blog handlers", () => {
  const make = () => {
    const posts = { listPublished: vi.fn(async () => ({ items: [] })), getPublished: vi.fn(async () => ({ slug: "a" })) };
    const categories = { listPublic: vi.fn(async () => [{ slug: "news" }]) };
    const tags = { listPublic: vi.fn(async () => [{ slug: "ai" }]) };
    return { posts, categories, tags, handlers: createBlogHandlers(posts, categories, tags) };
  };
  it("lists posts and categories and tags with a short cache time", async () => {
    const { handlers, posts } = make();
    const list = await call(handlers.listPosts, { query: { page: "1" } });
    expect(list.json).toEqual({ success: true, data: { items: [] } });
    expect(list.headers["Cache-Control"]).toBe("public, max-age=60");
    expect(posts.listPublished).toHaveBeenCalledWith({ page: "1" });
    expect((await call(handlers.listCategories, {})).json).toEqual({ success: true, data: [{ slug: "news" }] });
    expect((await call(handlers.listTags, {})).headers["Cache-Control"]).toBe("public, max-age=60");
  });
  it("returns one post by slug", async () => {
    const { handlers, posts } = make();
    const out = await call(handlers.getPost, { params: { slug: "a" } });
    expect(out.json).toEqual({ success: true, data: { slug: "a" } });
    expect(posts.getPublished).toHaveBeenCalledWith("a");
  });
  it("does not cache an error", async () => {
    const failure = new AppError(404, "NOT_FOUND", "That post was not found.");
    const posts = {
      listPublished: async () => ({}),
      getPublished: async () => {
        throw failure;
      },
    };
    const handlers = createBlogHandlers(posts, { listPublic: async () => [] }, { listPublic: async () => [] });
    const out = await call(handlers.getPost, { params: { slug: "x" } });
    expect(out.error).toBe(failure);
    expect(out.headers["Cache-Control"]).toBeUndefined();
  });
});