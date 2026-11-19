import { describe, expect, it } from "vitest";
import { createPostService } from "../src/services/postService";
import { fakePostRepo, type FakeTerm } from "./fakeBlogRepo";

const CAT: FakeTerm = { id: "65b000000000000000000001", kind: "category", name: "News", slug: "news", description: "" };
const TAG1: FakeTerm = { id: "65b000000000000000000002", kind: "tag", name: "AI", slug: "ai", description: "" };
const TAG2: FakeTerm = { id: "65b000000000000000000003", kind: "tag", name: "Tips", slug: "tips", description: "" };
const NOW = new Date("2026-11-19T05:00:00.000Z");

// Asli saaf karne wala yahan nahi; ye jhoota sirf <script> hata deta hai, taake service ka rasta dekha ja sake
const fakeSanitize = (html: string) => html.replace(/<script[\s\S]*?<\/script>/gi, "");

function setup() {
  const fake = fakePostRepo([CAT, TAG1, TAG2]);
  let current = NOW;
  const service = createPostService({ repo: fake.repo, sanitize: fakeSanitize, now: () => current });
  return { ...fake, service, setNow: (date: Date) => (current = date) };
}

const code = (promise: Promise<unknown>) => promise.then(() => "no error", (e: { code?: string }) => e.code ?? "other");
const body = (extra: Record<string, unknown> = {}) => ({ title: "My First Post", contentHtml: "<p>Hello world, this is the body.</p>", ...extra });

describe("create", () => {
  it("saves a draft with a slug made from the title", async () => {
    const { service, posts } = setup();
    const post = await service.create(body());
    expect(post).toMatchObject({ title: "My First Post", slug: "my-first-post", status: "draft", publishedAt: null });
    expect(posts).toHaveLength(1);
  });
  it("fills the excerpt and reading time from the content when none is given", async () => {
    const { service } = setup();
    const post = await service.create(body());
    expect(post.excerpt).toBe("Hello world, this is the body.");
    expect(post.readingMinutes).toBe(1);
    expect((await service.create(body({ title: "Other", excerpt: "My own summary" }))).excerpt).toBe("My own summary");
  });
  it("cuts a long automatic excerpt", async () => {
    const { service } = setup();
    const post = await service.create(body({ contentHtml: `<p>${"word ".repeat(100)}</p>` }));
    expect(post.excerpt.length).toBeLessThanOrEqual(161);
    expect(post.excerpt.endsWith("\u2026")).toBe(true);
  });
  it("sets the publish time when created as published", async () => {
    const { service } = setup();
    const post = await service.create(body({ status: "published" }));
    expect(post.status).toBe("published");
    expect(post.publishedAt).toBe(NOW.toISOString());
  });
  it("saves the sanitized content, not the raw one", async () => {
    const { service, posts } = setup();
    await service.create(body({ contentHtml: "<p>Safe</p><script>alert(1)</script>" }));
    expect(posts[0]!.contentHtml).toBe("<p>Safe</p>");
  });
  it("adds a number when two posts have the same title", async () => {
    const { service } = setup();
    expect((await service.create(body())).slug).toBe("my-first-post");
    expect((await service.create(body())).slug).toBe("my-first-post-2");
    expect((await service.create(body())).slug).toBe("my-first-post-3");
  });
  it("uses 'post' when the title has no usable letters", async () => {
    const { service } = setup();
    expect((await service.create(body({ title: "\u0627\u0631\u062f\u0648 \u0645\u06cc\u06ba" }))).slug).toBe("post");
  });
  it("keeps the slug the admin chose, and refuses one that is taken", async () => {
    const { service } = setup();
    expect((await service.create(body({ slug: "Custom-Slug" }))).slug).toBe("custom-slug");
    expect(await code(service.create(body({ slug: "custom-slug" })))).toBe("SLUG_TAKEN");
  });
  it("tries again when the database reports a clash", async () => {
    const { service, repo, calls } = setup();
    repo.forceDuplicates = 2;
    const post = await service.create(body());
    expect(post.slug).toBe("my-first-post");
    expect(calls.insert).toBe(3);
  });
  it("gives up with a clear error when clashes continue, and with 409 for a chosen slug", async () => {
    const a = setup();
    a.repo.forceDuplicates = 10;
    expect(await code(a.service.create(body()))).toBe("SLUG_UNAVAILABLE");
    const b = setup();
    b.repo.forceDuplicates = 1;
    expect(await code(b.service.create(body({ slug: "mine" })))).toBe("SLUG_TAKEN");
  });
  it("checks the category and the tags exist", async () => {
    const { service, calls } = setup();
    expect(await code(service.create(body({ categoryId: "65b0000000000000000000ff" })))).toBe("VALIDATION_ERROR");
    expect(await code(service.create(body({ categoryId: TAG1.id })))).toBe("VALIDATION_ERROR"); // tag ko category nahi bana sakte
    expect(await code(service.create(body({ tagIds: [CAT.id] })))).toBe("VALIDATION_ERROR");
    expect(await code(service.create(body({ tagIds: ["65b0000000000000000000ff"] })))).toBe("VALIDATION_ERROR");
    expect(calls.insert).toBe(0);
    const post = await service.create(body({ categoryId: CAT.id, tagIds: [TAG1.id, TAG2.id] }));
    expect(post.category).toEqual({ id: CAT.id, name: "News", slug: "news" });
    expect(post.tags.map((t) => t.slug)).toEqual(["ai", "tips"]);
  });
  it("refuses a published post with no text content", async () => {
    const { service, calls } = setup();
    for (const contentHtml of ["", "<p></p>", "<script>alert(1)</script>", "  <br> "]) {
      expect(await code(service.create(body({ status: "published", contentHtml })))).toBe("VALIDATION_ERROR");
    }
    expect(calls.insert).toBe(0);
    expect((await service.create(body({ status: "draft", contentHtml: "" }))).status).toBe("draft"); // draft khali ho sakta hai
  });
  it("refuses bad input before touching the database", async () => {
    const { service, calls } = setup();
    expect(await code(service.create({}))).toBe("VALIDATION_ERROR");
    expect(await code(service.create(null))).toBe("VALIDATION_ERROR");
    expect(calls.insert).toBe(0);
  });
});

describe("update", () => {
  it("replaces the fields and keeps the slug when none is sent", async () => {
    const { service } = setup();
    const created = await service.create(body());
    const updated = await service.update(created.id, body({ title: "A New Title", contentHtml: "<p>New body</p>" }));
    expect(updated).toMatchObject({ id: created.id, title: "A New Title", slug: "my-first-post", contentHtml: "<p>New body</p>" });
  });
  it("changes the slug, but not to one another post uses", async () => {
    const { service } = setup();
    const first = await service.create(body());
    await service.create(body({ title: "Second" }));
    expect((await service.update(first.id, body({ slug: "brand-new" }))).slug).toBe("brand-new");
    expect(await code(service.update(first.id, body({ slug: "second" })))).toBe("SLUG_TAKEN");
    expect((await service.update(first.id, body({ slug: "brand-new" }))).slug).toBe("brand-new"); // apna hi slug dobara theek hai
  });
  it("sets the publish time once and keeps it afterwards", async () => {
    const { service, setNow } = setup();
    const created = await service.create(body());
    const published = await service.update(created.id, body({ status: "published" }));
    expect(published.publishedAt).toBe(NOW.toISOString());
    setNow(new Date("2026-12-25T00:00:00.000Z"));
    const unpublished = await service.update(created.id, body({ status: "draft" }));
    expect(unpublished.status).toBe("draft");
    expect(unpublished.publishedAt).toBe(NOW.toISOString());
    expect((await service.update(created.id, body({ status: "published" }))).publishedAt).toBe(NOW.toISOString());
  });
  it("answers not found for a missing or malformed id", async () => {
    const { service } = setup();
    expect(await code(service.update("65a0000000000000000009ff", body()))).toBe("NOT_FOUND");
    expect(await code(service.update("nope", body()))).toBe("NOT_FOUND");
    expect(await code(service.update("", body()))).toBe("NOT_FOUND");
  });
  it("checks the input and terms like create does", async () => {
    const { service, calls } = setup();
    const created = await service.create(body());
    expect(await code(service.update(created.id, { title: "" }))).toBe("VALIDATION_ERROR");
    expect(await code(service.update(created.id, body({ categoryId: "65b0000000000000000000ff" })))).toBe("VALIDATION_ERROR");
    expect(await code(service.update(created.id, body({ status: "published", contentHtml: "" })))).toBe("VALIDATION_ERROR");
    expect(calls.update).toBe(0);
  });
});

describe("setStatus", () => {
  it("publishes and unpublishes", async () => {
    const { service, setNow } = setup();
    const created = await service.create(body());
    const published = await service.setStatus(created.id, "published");
    setNow(new Date("2026-12-25T00:00:00.000Z"));
    expect(published).toMatchObject({ status: "published", publishedAt: NOW.toISOString() });
    expect(await service.setStatus(created.id, "draft")).toMatchObject({ status: "draft", publishedAt: NOW.toISOString() });
  });
  it("refuses a bad status, a missing post, and publishing an empty post", async () => {
    const { service } = setup();
    const empty = await service.create(body({ contentHtml: "" }));
    expect(await code(service.setStatus(empty.id, "scheduled"))).toBe("VALIDATION_ERROR");
    expect(await code(service.setStatus(empty.id, undefined))).toBe("VALIDATION_ERROR");
    expect(await code(service.setStatus(empty.id, "published"))).toBe("VALIDATION_ERROR");
    expect(await code(service.setStatus("65a0000000000000000009ff", "published"))).toBe("NOT_FOUND");
    expect(await code(service.setStatus("nope", "published"))).toBe("NOT_FOUND");
  });
});

describe("remove, get", () => {
  it("deletes a post and then it is gone", async () => {
    const { service, posts } = setup();
    const created = await service.create(body());
    await service.remove(created.id);
    expect(posts).toHaveLength(0);
    expect(await code(service.get(created.id))).toBe("NOT_FOUND");
    expect(await code(service.remove(created.id))).toBe("NOT_FOUND");
    expect(await code(service.remove("nope"))).toBe("NOT_FOUND");
  });
  it("returns the full post for the editor", async () => {
    const { service } = setup();
    const created = await service.create(body({ metaTitle: "SEO", metaDescription: "Desc", featuredImageUrl: "https://example.com/a.jpg", featuredImageAlt: "Alt" }));
    expect(await service.get(created.id)).toMatchObject({
      contentHtml: "<p>Hello world, this is the body.</p>",
      seo: { metaTitle: "SEO", metaDescription: "Desc" },
      featuredImage: { url: "https://example.com/a.jpg", alt: "Alt" },
    });
    expect(await code(service.get("nope"))).toBe("NOT_FOUND");
  });
});

describe("list and stats", () => {
  async function filled() {
    const ctx = setup();
    await ctx.service.create(body({ title: "Alpha", status: "published", categoryId: CAT.id, tagIds: [TAG1.id] }));
    await ctx.service.create(body({ title: "Beta", status: "draft" }));
    await ctx.service.create(body({ title: "Gamma", status: "published", tagIds: [TAG2.id] }));
    return ctx;
  }
  it("lists all posts for the admin, newest edit first, without the content", async () => {
    const { service } = await filled();
    const page = await service.list({});
    expect(page).toMatchObject({ page: 1, pageSize: 10, total: 3, totalPages: 1 });
    expect(page.items.map((p) => p.title)).toEqual(["Gamma", "Beta", "Alpha"]);
    expect(page.items[0]).not.toHaveProperty("contentHtml");
  });
  it("filters by status and search, and pages the results", async () => {
    const { service } = await filled();
    expect((await service.list({ status: "draft" })).items.map((p) => p.title)).toEqual(["Beta"]);
    expect((await service.list({ q: "alp" })).items.map((p) => p.title)).toEqual(["Alpha"]);
    const page2 = await service.list({ pageSize: "2", page: "2" });
    expect(page2).toMatchObject({ page: 2, pageSize: 2, total: 3, totalPages: 2 });
    expect(page2.items).toHaveLength(1);
  });
  it("counts the posts for the dashboard", async () => {
    const { service } = await filled();
    const stats = await service.stats();
    expect(stats.totals).toEqual({ posts: 3, published: 2, drafts: 1, categories: 1, tags: 2 });
    expect(stats.recent).toHaveLength(3);
  });
  it("shows the public only published posts, with the safe fields", async () => {
    const { service } = await filled();
    const page = await service.listPublished({ status: "draft" }); // status ka sawal nazar-andaz
    expect(page.items.map((p) => p.title).sort()).toEqual(["Alpha", "Gamma"]);
    expect(page.pageSize).toBe(9);
    const first = page.items[0]!;
    expect(first).not.toHaveProperty("id");
    expect(first).not.toHaveProperty("status");
    expect(first).not.toHaveProperty("contentHtml");
    expect(first).toHaveProperty("readingMinutes");
    expect((await service.listPublished({ category: "news" })).items.map((p) => p.title)).toEqual(["Alpha"]);
    expect((await service.listPublished({ tag: "tips" })).items.map((p) => p.title)).toEqual(["Gamma"]);
  });
  it("returns one published post by slug, and nothing for drafts or bad slugs", async () => {
    const { service } = await filled();
    const post = await service.getPublished("alpha");
    expect(post).toMatchObject({ title: "Alpha", slug: "alpha", category: { name: "News", slug: "news" } });
    expect(post.contentHtml).toContain("Hello world");
    expect(post.seo).toEqual({ title: "Alpha", description: "Hello world, this is the body." });
    expect(post).not.toHaveProperty("id");
    expect(await code(service.getPublished("beta"))).toBe("NOT_FOUND"); // draft
    expect(await code(service.getPublished("missing"))).toBe("NOT_FOUND");
    expect(await code(service.getPublished("Bad Slug"))).toBe("NOT_FOUND");
    expect(await code(service.getPublished(""))).toBe("NOT_FOUND");
  });
  it("uses the SEO fields for the public page when they are set", async () => {
    const { service } = setup();
    await service.create(body({ status: "published", metaTitle: "Custom SEO", metaDescription: "Custom description" }));
    expect((await service.getPublished("my-first-post")).seo).toEqual({ title: "Custom SEO", description: "Custom description" });
  });
});