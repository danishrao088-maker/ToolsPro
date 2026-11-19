import { describe, expect, it } from "vitest";
import { buildPageFields, buildPostFields, collectTerms, dropUndefined } from "../src/blog/importMap";
import type { WpRecord } from "../src/blog/types";

function record(over: Partial<WpRecord> = {}): WpRecord {
  return {
    wpId: 10,
    type: "post",
    status: "publish",
    slug: "hello-world",
    title: "Hello",
    content: "<p>Body</p>",
    excerpt: "Short",
    publishedAt: new Date("2021-04-02T05:00:00Z"),
    modifiedAt: new Date("2021-05-01T05:00:00Z"),
    authorLogin: "admin",
    authorName: "Ali Khan",
    categories: [{ name: "Tech", slug: "tech" }],
    categoryTrail: [
      { name: "Tech", slug: "tech" },
      { name: "News", slug: "news" },
    ],
    primaryCategory: "tech",
    tags: [{ name: "Crane", slug: "crane" }],
    featuredImage: {
      path: "/wp-content/uploads/a.jpg",
      alt: "A crane",
      width: 1200,
      height: 800,
      cardPath: "/wp-content/uploads/a-768x512.jpg",
      cardWidth: 768,
      cardHeight: 512,
    },
    seo: { title: "SEO title", description: "SEO desc", focusKeyword: "crane" },
    views: 5,
    readingMinutes: 3,
    legacyUrl: "https://example.com/hello-world/",
    ...over,
  };
}

const lookup = (kind: "category" | "tag", slug: string) => `${kind}:${slug}`;

describe("collectTerms", () => {
  it("collects unique categories (with parents) and tags from posts only", () => {
    const sets = collectTerms([
      record(),
      record({ wpId: 11, slug: "second", tags: [{ name: "Crane", slug: "crane" }, { name: "Lift", slug: "lift" }] }),
      record({ wpId: 12, type: "page", slug: "page", categoryTrail: [{ name: "Ignored", slug: "ignored" }], tags: [] }),
    ]);
    expect(sets.categories.map((c) => c.slug).sort()).toEqual(["news", "tech"]);
    expect(sets.tags.map((t) => t.slug).sort()).toEqual(["crane", "lift"]);
  });
});

describe("buildPostFields", () => {
  it("maps WordPress fields onto the Post schema", () => {
    const f = buildPostFields(record(), lookup);
    expect(f.contentHtml).toBe("<p>Body</p>");
    expect(f.status).toBe("published");
    expect(f.category).toBe("category:tech");
    expect(f.categories).toEqual(["category:tech", "category:news"]);
    expect(f.tags).toEqual(["tag:crane"]);
    expect(f.featuredImageUrl).toBe("/wp-content/uploads/a.jpg");
    expect(f.featuredImageCardUrl).toBe("/wp-content/uploads/a-768x512.jpg");
    expect(f.featuredImageWidth).toBe(1200);
    expect(f.metaTitle).toBe("SEO title");
    expect(f.metaDescription).toBe("SEO desc");
    expect(f.authorName).toBe("Ali Khan");
  });

  it("keeps the original WordPress dates", () => {
    const f = buildPostFields(record(), lookup);
    expect(f.createdAt.toISOString()).toBe("2021-04-02T05:00:00.000Z");
    expect(f.updatedAt.toISOString()).toBe("2021-05-01T05:00:00.000Z");
  });

  it("falls back to the first assigned category when no primary is set", () => {
    const f = buildPostFields(record({ primaryCategory: undefined }), lookup);
    expect(f.category).toBe("category:tech");
  });

  it("handles posts without category, image or SEO", () => {
    const f = buildPostFields(
      record({ categories: [], categoryTrail: [], primaryCategory: undefined, tags: [], featuredImage: undefined, seo: {} }),
      lookup
    );
    expect(f.category).toBeNull();
    expect(f.categories).toEqual([]);
    expect(f.featuredImageUrl).toBe("");
    expect("featuredImageWidth" in f).toBe(false); // undefined ki jagah field hi nahi bhejte
    expect(f.metaTitle).toBe("");
  });

  it("skips terms whose id could not be found", () => {
    const f = buildPostFields(record(), (kind, slug) => (slug === "news" ? undefined : `${kind}:${slug}`));
    expect(f.categories).toEqual(["category:tech"]);
  });
});

describe("buildPageFields", () => {
  it("maps a WordPress page", () => {
    const f = buildPageFields(record({ type: "page", slug: "disclaimer", title: "Disclaimer" }));
    expect(f).toMatchObject({ slug: "disclaimer", title: "Disclaimer", contentHtml: "<p>Body</p>", metaTitle: "SEO title" });
    expect(f.updatedAt.toISOString()).toBe("2021-05-01T05:00:00.000Z");
  });
});

describe("dropUndefined", () => {
  it("removes undefined values but keeps null, empty and zero", () => {
    expect(dropUndefined({ a: undefined, b: null, c: "", d: 0, e: 1 })).toEqual({ b: null, c: "", d: 0, e: 1 });
  });
});
