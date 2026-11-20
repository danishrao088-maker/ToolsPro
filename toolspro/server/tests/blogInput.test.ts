import { describe, expect, it } from "vitest";
import { LIMITS, parseListQuery, parsePostInput, parseTermInput } from "../src/services/blogInput";

const ID1 = "65a000000000000000000001";
const ID2 = "65a000000000000000000002";

function codeOf(run: () => unknown): string {
  try {
    run();
    return "no error";
  } catch (error) {
    return (error as { code?: string }).code ?? "other";
  }
}
function messageOf(run: () => unknown): string {
  try {
    run();
    return "";
  } catch (error) {
    return (error as Error).message;
  }
}

describe("parsePostInput", () => {
  it("accepts a minimal post and fills the defaults", () => {
    expect(parsePostInput({ title: "  My   first post " })).toEqual({
      title: "My first post",
      slug: undefined,
      excerpt: "",
      contentHtml: "",
      status: "draft",
      categoryId: null,
      categoryIds: [],
      tagIds: [],
      featuredImageUrl: "",
      featuredImageAlt: "",
      metaTitle: "",
      metaDescription: "",
    });
  });
  it("accepts a full post", () => {
    const input = parsePostInput({
      title: "Title",
      slug: " My-Slug ",
      excerpt: "Short",
      contentHtml: "<p>Body</p>",
      status: "published",
      categoryId: ID1.toUpperCase(),
      tagIds: [ID2, ID2.toUpperCase(), ID1],
      featuredImageUrl: "https://res.cloudinary.com/x/image/upload/a.jpg",
      featuredImageAlt: "A picture",
      metaTitle: "SEO title",
      metaDescription: "SEO description",
    });
    expect(input.slug).toBe("my-slug");
    expect(input.status).toBe("published");
    expect(input.categoryId).toBe(ID1);
    expect(input.tagIds).toEqual([ID2, ID1]);
    expect(input.featuredImageUrl).toBe("https://res.cloudinary.com/x/image/upload/a.jpg");
  });
  it("treats empty category, slug and image as not set", () => {
    const input = parsePostInput({ title: "T", categoryId: "", slug: "  ", featuredImageUrl: "", tagIds: null });
    expect(input.categoryId).toBeNull();
    expect(input.slug).toBeUndefined();
    expect(input.featuredImageUrl).toBe("");
    expect(input.tagIds).toEqual([]);
  });
  it("needs a body and a title", () => {
    for (const body of [undefined, null, "text", 5, [], [{ title: "x" }]]) expect(codeOf(() => parsePostInput(body))).toBe("VALIDATION_ERROR");
    for (const title of [undefined, null, "", "   "]) expect(messageOf(() => parsePostInput({ title }))).toBe("The title is required.");
    expect(messageOf(() => parsePostInput({ title: 5 }))).toBe("The title must be text.");
  });
  it("refuses values that are too long", () => {
    expect(codeOf(() => parsePostInput({ title: "x".repeat(LIMITS.title + 1) }))).toBe("VALIDATION_ERROR");
    expect(codeOf(() => parsePostInput({ title: "t", excerpt: "x".repeat(LIMITS.excerpt + 1) }))).toBe("VALIDATION_ERROR");
    expect(codeOf(() => parsePostInput({ title: "t", metaTitle: "x".repeat(LIMITS.metaTitle + 1) }))).toBe("VALIDATION_ERROR");
    expect(codeOf(() => parsePostInput({ title: "t", metaDescription: "x".repeat(LIMITS.metaDescription + 1) }))).toBe("VALIDATION_ERROR");
    expect(codeOf(() => parsePostInput({ title: "t", contentHtml: "x".repeat(LIMITS.content + 1) }))).toBe("VALIDATION_ERROR");
    expect(parsePostInput({ title: "x".repeat(LIMITS.title) }).title).toHaveLength(LIMITS.title);
  });
  it("refuses a bad status, slug, category or tags", () => {
    expect(codeOf(() => parsePostInput({ title: "t", status: "scheduled" }))).toBe("VALIDATION_ERROR");
    expect(codeOf(() => parsePostInput({ title: "t", slug: "Bad Slug" }))).toBe("VALIDATION_ERROR");
    expect(codeOf(() => parsePostInput({ title: "t", slug: 5 }))).toBe("VALIDATION_ERROR");
    expect(codeOf(() => parsePostInput({ title: "t", categoryId: "nope" }))).toBe("VALIDATION_ERROR");
    expect(codeOf(() => parsePostInput({ title: "t", categoryId: 5 }))).toBe("VALIDATION_ERROR");
    expect(codeOf(() => parsePostInput({ title: "t", tagIds: "abc" }))).toBe("VALIDATION_ERROR");
    expect(codeOf(() => parsePostInput({ title: "t", tagIds: [ID1, "nope"] }))).toBe("VALIDATION_ERROR");
    expect(codeOf(() => parsePostInput({ title: "t", tagIds: [{ $ne: "" }] }))).toBe("VALIDATION_ERROR");
    const many = Array.from({ length: LIMITS.tags + 1 }, (_, i) => `65a0000000000000000000${String(i).padStart(2, "0")}`);
    expect(codeOf(() => parsePostInput({ title: "t", tagIds: many }))).toBe("VALIDATION_ERROR");
  });
  it("only accepts an https image address", () => {
    for (const url of ["http://example.com/a.jpg", "javascript:alert(1)", "data:image/png;base64,AAAA", "//example.com/a.jpg", "not a url", "ftp://x.com/a.jpg"]) {
      expect(codeOf(() => parsePostInput({ title: "t", featuredImageUrl: url }))).toBe("VALIDATION_ERROR");
    }
    expect(codeOf(() => parsePostInput({ title: "t", featuredImageUrl: 5 }))).toBe("VALIDATION_ERROR");
    expect(codeOf(() => parsePostInput({ title: "t", featuredImageUrl: `https://example.com/${"a".repeat(LIMITS.imageUrl)}` }))).toBe("VALIDATION_ERROR");
  });
});

describe("parseTermInput", () => {
  it("accepts a name and optional slug and description", () => {
    expect(parseTermInput({ name: " Web  Tools ", slug: "Web-Tools", description: " About tools " }, "category")).toEqual({
      name: "Web Tools",
      slug: "web-tools",
      description: "About tools",
    });
    expect(parseTermInput({ name: "News" }, "tag")).toEqual({ name: "News", slug: undefined, description: "" });
  });
  it("refuses a missing name or bad values, naming the kind in the message", () => {
    expect(messageOf(() => parseTermInput({ name: "" }, "tag"))).toBe("The tag name is required.");
    expect(messageOf(() => parseTermInput({}, "category"))).toBe("The category name is required.");
    expect(codeOf(() => parseTermInput({ name: "x".repeat(LIMITS.termName + 1) }, "tag"))).toBe("VALIDATION_ERROR");
    expect(codeOf(() => parseTermInput({ name: "ok", slug: "Bad Slug" }, "tag"))).toBe("VALIDATION_ERROR");
    expect(codeOf(() => parseTermInput({ name: "ok", description: "x".repeat(LIMITS.termDescription + 1) }, "tag"))).toBe("VALIDATION_ERROR");
    expect(codeOf(() => parseTermInput(null, "tag"))).toBe("VALIDATION_ERROR");
  });
});

describe("parseListQuery", () => {
  it("uses defaults for an empty query", () => {
    expect(parseListQuery({}, 10)).toEqual({ page: 1, pageSize: 10, status: undefined, q: undefined, categorySlug: undefined, tagSlug: undefined });
    expect(parseListQuery(undefined, 9).pageSize).toBe(9);
  });
  it("reads good values", () => {
    expect(parseListQuery({ page: "3", pageSize: "20", status: "draft", q: " tools ", category: "news", tag: "ai-tools" }, 10)).toEqual({
      page: 3,
      pageSize: 20,
      status: "draft",
      q: "tools",
      categorySlug: "news",
      tagSlug: "ai-tools",
    });
  });
  it("ignores bad values and keeps numbers in range", () => {
    const query = parseListQuery({ page: "-2", pageSize: "abc", status: "x", category: "Bad Slug", tag: "UPPER", q: "" }, 10);
    expect(query).toEqual({ page: 1, pageSize: 10, status: undefined, q: undefined, categorySlug: undefined, tagSlug: undefined });
    expect(parseListQuery({ page: "0" }, 10).page).toBe(1);
    expect(parseListQuery({ page: "1.5" }, 10).page).toBe(1);
    expect(parseListQuery({ pageSize: "9999" }, 10).pageSize).toBe(50);
    expect(parseListQuery({ q: "x".repeat(500) }, 10).q).toHaveLength(LIMITS.search);
  });
  it("ignores repeated or object values", () => {
    const query = parseListQuery({ page: ["1", "2"], status: { $ne: "" }, q: ["a", "b"] }, 10);
    expect(query).toEqual({ page: 1, pageSize: 10, status: undefined, q: undefined, categorySlug: undefined, tagSlug: undefined });
    expect(parseListQuery("junk", 10).page).toBe(1);
    expect(parseListQuery(null, 10).page).toBe(1);
  });
});
describe("parsePostInput: site images and several categories", () => {
  it("accepts a picture that lives on this site (WordPress or uploaded)", () => {
    expect(parsePostInput({ title: "t", featuredImageUrl: "/wp-content/uploads/2024/05/photo-1_300x200.webp" }).featuredImageUrl).toBe("/wp-content/uploads/2024/05/photo-1_300x200.webp");
    expect(parsePostInput({ title: "t", featuredImageUrl: "/wp-content/uploads/2021/a%20b@2x.png" }).featuredImageUrl).toBe("/wp-content/uploads/2021/a%20b@2x.png");
  });
  it("refuses other local paths and tricks", () => {
    for (const bad of ["/etc/passwd", "/wp-content/uploads/../secret.png", "//evil.example/a.png", "/wp-content/uploads//a.png", "/wp-content/uploads/a b.png", '/wp-content/uploads/a".png', "/wp-content/uploads/a.png?x=1", "/wp-content/plugins/a.png", "/wp-content/uploads/"]) {
      expect(codeOf(() => parsePostInput({ title: "t", featuredImageUrl: bad })), bad).toBe("VALIDATION_ERROR");
    }
  });
  it("takes a list of categories and makes the first one the main category", () => {
    const input = parsePostInput({ title: "t", categoryIds: [ID2, ID1, ID2.toUpperCase()] });
    expect(input.categoryIds).toEqual([ID2, ID1]);
    expect(input.categoryId).toBe(ID2);
  });
  it("an empty list means no category", () => {
    const input = parsePostInput({ title: "t", categoryId: ID1, categoryIds: [] });
    expect(input.categoryIds).toEqual([]);
    expect(input.categoryId).toBeNull();
  });
  it("still understands the old single categoryId", () => {
    const input = parsePostInput({ title: "t", categoryId: ID1.toUpperCase() });
    expect(input.categoryId).toBe(ID1);
    expect(input.categoryIds).toEqual([ID1]);
  });
  it("rejects a bad or too long category list", () => {
    expect(codeOf(() => parsePostInput({ title: "t", categoryIds: "x" }))).toBe("VALIDATION_ERROR");
    expect(codeOf(() => parsePostInput({ title: "t", categoryIds: ["nope"] }))).toBe("VALIDATION_ERROR");
    const many = Array.from({ length: LIMITS.categories + 1 }, (_, i) => `65b0000000000000000000${String(i).padStart(2, "0")}`);
    expect(codeOf(() => parsePostInput({ title: "t", categoryIds: many }))).toBe("VALIDATION_ERROR");
  });
});
