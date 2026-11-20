import { describe, expect, it } from "vitest";
import { checkImageFile, emptyPostForm, formatDate, moveToFront, needsHtmlMode, postToForm, postUrl, slugify, toggleId } from "./editorUtils";
import type { AdminPostDetail } from "./types";

describe("slugify", () => {
  it("makes a clean address from a title", () => {
    expect(slugify("  Hello, World! 2026 ")).toBe("hello-world-2026");
    expect(slugify("Café — Tips & Tricks")).toBe("cafe-tips-tricks");
  });
  it("gives an empty text when there are no usable letters, and keeps it short", () => {
    expect(slugify("اردو")).toBe("");
    expect(slugify("word ".repeat(60)).length).toBeLessThanOrEqual(80);
    expect(slugify("word ".repeat(60)).endsWith("-")).toBe(false);
  });
});

describe("needsHtmlMode", () => {
  it("is true for posts with embeds, video or other things the visual editor cannot keep", () => {
    for (const html of ['<p>x</p><iframe src="https://www.youtube.com/embed/a"></iframe>', "<VIDEO src=a></VIDEO>", "<audio></audio>", "<svg></svg>", "<style>p{}</style>", "<figure><img src=a><figcaption>Cap</figcaption></figure>"]) {
      expect(needsHtmlMode(html), html).toBe(true);
    }
  });
  it("is false for ordinary articles", () => {
    expect(needsHtmlMode('<h2>Hi</h2><p>Text <a href="/x/">link</a></p><table><tr><td>1</td></tr></table><img src="/a.png">')).toBe(false);
    expect(needsHtmlMode("<p>an iframe is a tag</p>")).toBe(false);
  });
});

describe("small helpers", () => {
  it("builds the public address of a post", () => {
    expect(postUrl("my-post")).toBe("/my-post/");
  });
  it("moves one id to the front without losing the others", () => {
    expect(moveToFront(["a", "b", "c"], "c")).toEqual(["c", "a", "b"]);
    expect(moveToFront(["a", "b"], "z")).toEqual(["a", "b"]);
  });
  it("adds or removes an id", () => {
    expect(toggleId(["a"], "b")).toEqual(["a", "b"]);
    expect(toggleId(["a", "b"], "a")).toEqual(["b"]);
  });
  it("formats dates and handles empty ones", () => {
    expect(formatDate(null)).toBe("—");
    expect(formatDate("not a date")).toBe("—");
    expect(formatDate("2026-11-19T10:00:00.000Z")).toContain("2026");
  });
});

describe("postToForm", () => {
  const detail: AdminPostDetail = {
    id: "p1",
    title: "Hello",
    slug: "hello",
    excerpt: "Short",
    status: "published",
    publishedAt: "2026-01-01T00:00:00.000Z",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-02T00:00:00.000Z",
    category: { id: "c2", name: "Child", slug: "child" },
    categories: [
      { id: "c1", name: "Parent", slug: "parent" },
      { id: "c2", name: "Child", slug: "child" },
    ],
    tags: [{ id: "t1", name: "One", slug: "one" }],
    featuredImage: { url: "/wp-content/uploads/a.webp", alt: "A" },
    contentHtml: "<p>Body</p>",
    readingMinutes: 1,
    seo: { metaTitle: "MT", metaDescription: "MD" },
  };

  it("keeps the main category first and drops duplicates", () => {
    expect(postToForm(detail).categoryIds).toEqual(["c2", "c1"]);
  });
  it("copies the other fields into the form shape", () => {
    expect(postToForm(detail)).toEqual({
      title: "Hello",
      slug: "hello",
      excerpt: "Short",
      contentHtml: "<p>Body</p>",
      status: "published",
      categoryIds: ["c2", "c1"],
      tagIds: ["t1"],
      featuredImageUrl: "/wp-content/uploads/a.webp",
      featuredImageAlt: "A",
      metaTitle: "MT",
      metaDescription: "MD",
    });
  });
  it("copes with a post that has no main category", () => {
    expect(postToForm({ ...detail, category: null, categories: [] }).categoryIds).toEqual([]);
  });
  it("starts new posts as empty drafts", () => {
    expect(emptyPostForm()).toMatchObject({ title: "", status: "draft", categoryIds: [], tagIds: [] });
  });
});

describe("checkImageFile", () => {
  it("accepts normal pictures", () => {
    expect(checkImageFile({ type: "image/png", size: 1000 })).toBeNull();
    expect(checkImageFile({ type: "image/webp", size: 8 * 1024 * 1024 })).toBeNull();
  });
  it("refuses other types (including SVG) and oversized files", () => {
    expect(checkImageFile({ type: "image/svg+xml", size: 100 })).toMatch(/JPG, PNG, GIF or WebP/);
    expect(checkImageFile({ type: "application/pdf", size: 100 })).not.toBeNull();
    expect(checkImageFile({ type: "image/jpeg", size: 8 * 1024 * 1024 + 1 })).toMatch(/too large/);
  });
});
