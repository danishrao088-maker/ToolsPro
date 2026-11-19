import { describe, expect, it } from "vitest";
import { pageToView, termIdsOf, toView, type RawPost, type TermMap } from "../src/blog/viewMap";

const terms: TermMap = new Map([
  ["c1", { name: "Tech", slug: "tech" }],
  ["c2", { name: "News", slug: "news" }],
  ["t1", { name: "Crane", slug: "crane" }],
]);

function raw(over: Partial<RawPost> = {}): RawPost {
  return {
    _id: "p1",
    slug: "hello-world",
    title: "Hello",
    contentHtml: "<p>Body</p>",
    excerpt: "Short",
    publishedAt: new Date("2021-04-02T05:00:00Z"),
    updatedAt: new Date("2021-05-01T05:00:00Z"),
    authorName: "Ali Khan",
    authorLogin: "admin",
    category: "c1",
    categories: ["c1", "c2"],
    tags: ["t1", "gone"],
    featuredImageUrl: "/wp-content/uploads/a.jpg",
    featuredImageAlt: "A crane",
    featuredImageWidth: 1200,
    featuredImageHeight: 800,
    featuredImageCardUrl: "/wp-content/uploads/a-768x512.jpg",
    featuredImageCardWidth: 768,
    featuredImageCardHeight: 512,
    metaTitle: "SEO title",
    metaDescription: "SEO desc",
    readingMinutes: 4,
    ...over,
  };
}

describe("termIdsOf", () => {
  it("gathers every category and tag id once", () => {
    expect(termIdsOf([raw(), raw({ _id: "p2", category: "c2", categories: [], tags: ["t1"] })]).sort()).toEqual([
      "c1",
      "c2",
      "gone",
      "t1",
    ]);
  });
});

describe("toView", () => {
  it("maps an imported WordPress post", () => {
    const v = toView(raw(), terms);
    expect(v.type).toBe("post");
    expect(v.content).toBe("<p>Body</p>");
    expect(v.categories.map((c) => c.slug)).toEqual(["tech", "news"]);
    expect(v.primaryCategory).toBe("tech");
    expect(v.tags).toEqual([{ name: "Crane", slug: "crane" }]); // jo term hat gaya wo nahi aata
    expect(v.seo).toEqual({ title: "SEO title", description: "SEO desc" });
    expect(v.featuredImage).toMatchObject({ path: "/wp-content/uploads/a.jpg", width: 1200, cardPath: "/wp-content/uploads/a-768x512.jpg", cardWidth: 768 });
    expect(v.modifiedAt.toISOString()).toBe("2021-05-01T05:00:00.000Z");
  });

  it("maps a post written in the admin (single category, no WordPress fields)", () => {
    const v = toView(
      raw({
        categories: undefined,
        authorName: undefined,
        authorLogin: undefined,
        featuredImageUrl: "https://cdn.example.com/x.png",
        featuredImageWidth: undefined,
        featuredImageCardUrl: "",
        metaTitle: "",
        metaDescription: "",
      }),
      terms
    );
    expect(v.categories.map((c) => c.slug)).toEqual(["tech"]);
    expect(v.authorName).toBe("");
    expect(v.featuredImage).toMatchObject({ path: "https://cdn.example.com/x.png", cardPath: undefined, width: undefined });
    expect(v.seo).toEqual({ title: undefined, description: undefined });
  });

  it("works with no category, no image and no publish date", () => {
    const v = toView(
      raw({ category: null, categories: [], tags: [], featuredImageUrl: "", publishedAt: null, createdAt: new Date("2020-01-01T00:00:00Z") }),
      terms
    );
    expect(v.categories).toEqual([]);
    expect(v.primaryCategory).toBeUndefined();
    expect(v.featuredImage).toBeUndefined();
    expect(v.publishedAt.toISOString()).toBe("2020-01-01T00:00:00.000Z");
  });

  it("uses the first category as primary when the main one is missing", () => {
    const v = toView(raw({ category: null }), terms);
    expect(v.primaryCategory).toBe("tech");
  });
});

describe("pageToView", () => {
  it("maps a static page", () => {
    const v = pageToView({
      _id: "x",
      slug: "disclaimer",
      title: "Disclaimer",
      contentHtml: "<p>Text</p>",
      publishedAt: new Date("2020-01-01T00:00:00Z"),
      updatedAt: new Date("2020-02-01T00:00:00Z"),
      metaTitle: "",
      metaDescription: "Desc",
    });
    expect(v.type).toBe("page");
    expect(v.categories).toEqual([]);
    expect(v.seo).toEqual({ title: undefined, description: "Desc" });
  });
});
