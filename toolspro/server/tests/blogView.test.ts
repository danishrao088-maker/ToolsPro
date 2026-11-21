import { describe, expect, it } from "vitest";
import type { PostRecord } from "../src/services/blogTypes";
import { adminDetail, adminSummary, pageOf, publicDetail, publicSummary } from "../src/services/blogView";

const post: PostRecord = {
  id: "65a000000000000000000001",
  title: "Title",
  slug: "title",
  excerpt: "Excerpt",
  contentHtml: "<p>Body</p>",
  status: "published",
  publishedAt: new Date("2026-11-19T00:00:00.000Z"),
  createdAt: new Date("2026-11-18T00:00:00.000Z"),
  updatedAt: new Date("2026-11-19T01:00:00.000Z"),
  category: { id: "65b000000000000000000001", name: "News", slug: "news" },
  categories: [{ id: "65b000000000000000000001", name: "News", slug: "news" }],
  tags: [{ id: "65b000000000000000000002", name: "AI", slug: "ai" }],
  featuredImageUrl: "https://example.com/a.jpg",
  featuredImageAlt: "Alt",
  metaTitle: "",
  metaDescription: "",
  readingMinutes: 3,
};

describe("admin views", () => {
  it("summary has ids and dates but no content", () => {
    const view = adminSummary(post);
    expect(view).toMatchObject({ id: post.id, status: "published", publishedAt: "2026-11-19T00:00:00.000Z", category: { id: post.category!.id } });
    expect(view).not.toHaveProperty("contentHtml");
    expect(JSON.stringify(view)).not.toContain("<p>");
  });
  it("lists every category of the post", () => {
    expect(adminSummary(post).categories).toEqual([{ id: "65b000000000000000000001", name: "News", slug: "news" }]);
  });
  it("detail adds the content and the SEO fields", () => {
    expect(adminDetail(post)).toMatchObject({ contentHtml: "<p>Body</p>", readingMinutes: 3, seo: { metaTitle: "", metaDescription: "" } });
  });
  it("shows null for a post that was never published, and no category", () => {
    const view = adminSummary({ ...post, publishedAt: null, category: null, categories: [], tags: [] });
    expect(view.publishedAt).toBeNull();
    expect(view.category).toBeNull();
    expect(view.tags).toEqual([]);
  });
});

describe("public views", () => {
  it("summary hides ids, status and content", () => {
    const view = publicSummary(post);
    expect(view).toEqual({
      slug: "title",
      title: "Title",
      excerpt: "Excerpt",
      publishedAt: "2026-11-19T00:00:00.000Z",
      readingMinutes: 3,
      category: { name: "News", slug: "news" },
      tags: [{ name: "AI", slug: "ai" }],
      featuredImage: { url: "https://example.com/a.jpg", alt: "Alt" },
    });
  });
  it("detail adds the content and falls back to the title and excerpt for SEO", () => {
    const view = publicDetail(post);
    expect(view.contentHtml).toBe("<p>Body</p>");
    expect(view.updatedAt).toBe("2026-11-19T01:00:00.000Z");
    expect(view.seo).toEqual({ title: "Title", description: "Excerpt" });
    expect(view).not.toHaveProperty("id");
    expect(publicDetail({ ...post, metaTitle: "SEO", metaDescription: "Desc" }).seo).toEqual({ title: "SEO", description: "Desc" });
  });
});

describe("pageOf", () => {
  it("counts the pages and has at least one", () => {
    expect(pageOf([1, 2], 25, 2, 10)).toEqual({ items: [1, 2], page: 2, pageSize: 10, total: 25, totalPages: 3 });
    expect(pageOf([], 0, 1, 10).totalPages).toBe(1);
    expect(pageOf([1], 10, 1, 10).totalPages).toBe(1);
  });
});