import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PostView } from "../src/blog/types";

const svc = vi.hoisted(() => ({
  blogAvailable: vi.fn(() => true),
  listPosts: vi.fn(),
  getBySlug: vi.fn(),
  getRelated: vi.fn(),
  getTerm: vi.fn(),
  getAuthorName: vi.fn(),
  getSitemapData: vi.fn(),
  latestForFeed: vi.fn(),
}));
vi.mock("../src/blog/blogService", () => svc);

import { blogRouter } from "../src/blog/routes";

function makePost(over: Partial<PostView> = {}): PostView {
  return {
    slug: "hello-world",
    type: "post",
    title: 'Hello <World> & "friends"',
    content: "<p>Body text</p>",
    excerpt: "Short excerpt",
    publishedAt: new Date("2021-04-02T05:00:00Z"),
    modifiedAt: new Date("2021-05-01T05:00:00Z"),
    authorLogin: "admin",
    authorName: "Ali Khan",
    categories: [{ name: "Tech", slug: "tech" }],
    primaryCategory: "tech",
    tags: [{ name: "Crane", slug: "crane" }],
    seo: {},
    readingMinutes: 2,
    ...over,
  };
}

function makeApp() {
  const app = express();
  app.set("etag", false);
  app.use(blogRouter);
  // React/SPA ki jagah: jo blog nahi pakadta wo yahan aata hai
  app.use((_req, res) => res.status(418).send("fell-through"));
  return app;
}

const emptyListing = { items: [], total: 0, page: 1, totalPages: 1 };

beforeEach(() => {
  vi.clearAllMocks();
  svc.blogAvailable.mockReturnValue(true);
  svc.getBySlug.mockResolvedValue(null);
  svc.getRelated.mockResolvedValue([]);
  svc.listPosts.mockResolvedValue(emptyListing);
  svc.getTerm.mockResolvedValue(null);
  svc.getAuthorName.mockResolvedValue(null);
});

describe("blog post pages", () => {
  it("renders a post with canonical, JSON-LD and escaped title", async () => {
    svc.getBySlug.mockResolvedValue(makePost());
    const res = await request(makeApp()).get("/hello-world/");
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toContain("text/html");
    expect(res.text).toContain('<link rel="canonical" href="http://localhost:5000/hello-world/">');
    expect(res.text).toContain('"@type":"BlogPosting"');
    expect(res.text).toContain("<h1>Hello &lt;World&gt; &amp; &quot;friends&quot;</h1>");
    expect(res.text).not.toContain("<World>");
    expect(res.text).toContain("<p>Body text</p>");
  });

  it("sets a relaxed CSP only on blog pages and caches them briefly", async () => {
    svc.getBySlug.mockResolvedValue(makePost());
    const res = await request(makeApp()).get("/hello-world/");
    expect(res.headers["content-security-policy"]).toMatch(/img-src[^;]*https:/);
    expect(res.headers["content-security-policy"]).toMatch(/frame-src[^;]*https:/);
    expect(res.headers["cache-control"]).toBe("public, max-age=300");
  });

  it("301-redirects a missing trailing slash and keeps the query string", async () => {
    svc.getBySlug.mockResolvedValue(makePost());
    const res = await request(makeApp()).get("/hello-world?utm=1");
    expect(res.status).toBe(301);
    expect(res.headers.location).toBe("/hello-world/?utm=1");
  });

  it("falls through when the slug does not exist", async () => {
    const res = await request(makeApp()).get("/nope/");
    expect(res.status).toBe(418);
  });

  it("falls through for reserved slugs without touching the database", async () => {
    for (const slug of ["about", "tools", "contact", "api", "robots.txt"]) {
      const res = await request(makeApp()).get(`/${slug}/`);
      expect(res.status).toBe(418);
    }
    expect(svc.getBySlug).not.toHaveBeenCalled();
  });

  it("redirects legacy WordPress pages to their React equivalents", async () => {
    const res = await request(makeApp()).get("/contact-us/");
    expect(res.status).toBe(301);
    expect(res.headers.location).toBe("/contact");
    expect((await request(makeApp()).get("/privacy-policy/")).headers.location).toBe("/privacy");
    expect((await request(makeApp()).get("/terms-and-conditions/")).headers.location).toBe("/terms");
  });

  it("renders pages without article JSON-LD", async () => {
    svc.getBySlug.mockResolvedValue(makePost({ type: "page", slug: "some-page", title: "Some page" }));
    const res = await request(makeApp()).get("/some-page/");
    expect(res.status).toBe(200);
    expect(res.text).not.toContain("BlogPosting");
  });

  it("skips the whole blog when the database is not connected", async () => {
    svc.blogAvailable.mockReturnValue(false);
    const res = await request(makeApp()).get("/hello-world/");
    expect(res.status).toBe(418);
    expect(svc.getBySlug).not.toHaveBeenCalled();
  });
});

describe("blog listings", () => {
  const card = (slug: string) => {
    const { content: _content, ...rest } = makePost({ slug, title: `Post ${slug}` });
    return rest;
  };

  it("lists posts on /blog/", async () => {
    svc.listPosts.mockResolvedValue({ items: [card("a"), card("b")], total: 2, page: 1, totalPages: 1 });
    const res = await request(makeApp()).get("/blog/");
    expect(res.status).toBe(200);
    expect(res.text).toContain("Post a");
    expect(res.text).toContain('href="http://localhost:5000/blog/"');
    expect(res.text).not.toContain("noindex");
  });

  it("redirects /blog to /blog/ and /blog/page/1/ to /blog/", async () => {
    expect((await request(makeApp()).get("/blog")).headers.location).toBe("/blog/");
    const res = await request(makeApp()).get("/blog/page/1/");
    expect(res.status).toBe(301);
    expect(res.headers.location).toBe("/blog/");
  });

  it("redirects the old WordPress /page/2/ to /blog/page/2/", async () => {
    const res = await request(makeApp()).get("/page/2/");
    expect(res.status).toBe(301);
    expect(res.headers.location).toBe("/blog/page/2/");
  });

  it("falls through for page numbers beyond the last page and for junk page values", async () => {
    svc.listPosts.mockResolvedValue({ items: [], total: 5, page: 9, totalPages: 1 });
    expect((await request(makeApp()).get("/blog/page/9/")).status).toBe(418);
    expect((await request(makeApp()).get("/blog/page/abc/")).status).toBe(418);
    expect((await request(makeApp()).get("/blog/page/0/")).status).toBe(418);
  });

  it("renders a blog category and falls through for unknown ones (React category page)", async () => {
    svc.getTerm.mockResolvedValueOnce({ name: "Tech", slug: "tech" });
    svc.listPosts.mockResolvedValue({ items: [card("a")], total: 1, page: 1, totalPages: 1 });
    const ok = await request(makeApp()).get("/category/tech/");
    expect(ok.status).toBe(200);
    expect(ok.text).toContain("<h1>Tech</h1>");
    expect(ok.text).not.toContain("noindex");
    expect(svc.listPosts).toHaveBeenCalledWith({ kind: "category", value: "tech" }, 1, 12);

    svc.getTerm.mockResolvedValueOnce(null);
    expect((await request(makeApp()).get("/category/image-tools/")).status).toBe(418);
  });

  it("marks tag and author archives noindex", async () => {
    svc.getTerm.mockResolvedValue({ name: "Crane", slug: "crane" });
    svc.getAuthorName.mockResolvedValue("Ali Khan");
    svc.listPosts.mockResolvedValue({ items: [card("a")], total: 1, page: 1, totalPages: 1 });
    const tag = await request(makeApp()).get("/tag/crane/");
    expect(tag.status).toBe(200);
    expect(tag.text).toContain("noindex");
    const author = await request(makeApp()).get("/author/admin/");
    expect(author.status).toBe(200);
    expect(author.text).toContain("noindex");
    expect(author.text).toContain("Ali Khan");
  });
});

describe("sitemap and feed", () => {
  it("serves sitemap.xml without reserved or redirected pages", async () => {
    svc.getSitemapData.mockResolvedValue({
      posts: [
        { slug: "hello-world", modifiedAt: new Date("2021-05-01T05:00:00Z"), type: "post" },
        { slug: "about", modifiedAt: new Date("2021-05-01T05:00:00Z"), type: "page" },
        { slug: "contact-us", modifiedAt: new Date("2021-05-01T05:00:00Z"), type: "page" },
      ],
      categories: ["tech"],
    });
    const res = await request(makeApp()).get("/sitemap.xml");
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toContain("xml");
    expect(res.text).toContain("<loc>http://localhost:5000/hello-world/</loc>");
    expect(res.text).toContain("<loc>http://localhost:5000/category/tech/</loc>");
    expect(res.text).toContain("<lastmod>2021-05-01T05:00:00.000Z</lastmod>");
    expect(res.text).not.toContain("/about/");
    expect(res.text).not.toContain("/contact-us/");
  });

  it("serves an RSS feed at /rss.xml and /feed/ with escaped titles", async () => {
    const { content: _c, ...card } = makePost();
    svc.latestForFeed.mockResolvedValue([card]);
    for (const url of ["/rss.xml", "/feed/", "/feed"]) {
      const res = await request(makeApp()).get(url);
      expect(res.status).toBe(200);
      expect(res.headers["content-type"]).toContain("rss+xml");
      expect(res.text).toContain("<rss");
      expect(res.text).toContain("Hello &lt;World&gt; &amp;");
      expect(res.text).not.toContain("<World>");
    }
  });
});
