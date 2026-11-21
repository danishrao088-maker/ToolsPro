import { describe, expect, it } from "vitest";
import {
  escapeRegex,
  htmlToText,
  isObjectIdString,
  isValidSlug,
  readingMinutes,
  slugify,
  truncateText,
  uniqueSlug,
} from "../src/services/blogText";

describe("slugify", () => {
  it("makes a clean slug", () => {
    expect(slugify("Hello, World!")).toBe("hello-world");
    expect(slugify("  Many   spaces -- and symbols?! ")).toBe("many-spaces-and-symbols");
    expect(slugify("Caf\u00e9 cr\u00e8me br\u00fbl\u00e9e")).toBe("cafe-creme-brulee");
    expect(slugify("10 Best Tools (2026)")).toBe("10-best-tools-2026");
  });
  it("returns an empty text when nothing usable is left", () => {
    expect(slugify("")).toBe("");
    expect(slugify("\u0627\u0631\u062f\u0648")).toBe("");
    expect(slugify("!!!")).toBe("");
  });
  it("keeps it short and never ends with a hyphen", () => {
    const slug = slugify(`${"word ".repeat(40)}end`);
    expect(slug.length).toBeLessThanOrEqual(80);
    expect(slug.endsWith("-")).toBe(false);
    expect(isValidSlug(slug)).toBe(true);
  });
});

describe("isValidSlug", () => {
  it("accepts good slugs", () => {
    for (const slug of ["a", "my-post", "post-2", "2026-review"]) expect(isValidSlug(slug)).toBe(true);
  });
  it("refuses bad ones", () => {
    for (const slug of ["", "My-Post", "-a", "a-", "a--b", "a b", "a/b", "a_b", "a".repeat(101), undefined, null, 5]) {
      expect(isValidSlug(slug)).toBe(false);
    }
  });
});

describe("uniqueSlug", () => {
  it("returns the base when it is free", async () => {
    expect(await uniqueSlug("my-post", async () => false)).toBe("my-post");
  });
  it("adds a number when taken", async () => {
    const used = new Set(["my-post", "my-post-2"]);
    expect(await uniqueSlug("my-post", async (s) => used.has(s))).toBe("my-post-3");
  });
  it("falls back to 'post' for an empty base", async () => {
    expect(await uniqueSlug("", async () => false)).toBe("post");
  });
  it("uses a random ending when too many are taken", async () => {
    const slug = await uniqueSlug("busy", async () => true);
    expect(slug).toMatch(/^busy-[0-9a-f]{6}$/);
  });
});

describe("htmlToText", () => {
  it("removes tags and decodes the basic entities", () => {
    expect(htmlToText("<p>Hello <strong>big</strong> world</p><p>Tom &amp; Jerry &lt;3</p>")).toBe("Hello big world Tom & Jerry <3");
  });
  it("drops script and style content", () => {
    expect(htmlToText("<p>a</p><script>alert(1)</script><style>p{}</style><p>b</p>")).toBe("a b");
  });
  it("collapses white space and handles empty input", () => {
    expect(htmlToText("  <p>  a \n\n b  </p> ")).toBe("a b");
    expect(htmlToText("")).toBe("");
    expect(htmlToText("<p></p><br>")).toBe("");
  });
});

describe("truncateText", () => {
  it("leaves short text alone", () => {
    expect(truncateText("short text", 50)).toBe("short text");
  });
  it("cuts at a word and adds an ellipsis", () => {
    const out = truncateText("one two three four five six seven", 20);
    expect(out).toBe("one two three four\u2026");
    expect(out.length).toBeLessThanOrEqual(21);
  });
  it("cuts a very long word without a space", () => {
    expect(truncateText("x".repeat(100), 10)).toBe(`${"x".repeat(10)}\u2026`);
  });
});

describe("readingMinutes", () => {
  it("is at least one minute", () => {
    expect(readingMinutes("")).toBe(1);
    expect(readingMinutes("a few words")).toBe(1);
  });
  it("counts about 200 words a minute", () => {
    expect(readingMinutes(Array(200).fill("w").join(" "))).toBe(1);
    expect(readingMinutes(Array(201).fill("w").join(" "))).toBe(2);
    expect(readingMinutes(Array(1000).fill("w").join(" "))).toBe(5);
  });
});

describe("escapeRegex and isObjectIdString", () => {
  it("escapes special characters", () => {
    expect(new RegExp(escapeRegex("a.b*c(d)")).test("a.b*c(d)")).toBe(true);
    expect(new RegExp(escapeRegex("a.b")).test("axb")).toBe(false);
  });
  it("recognises an id", () => {
    expect(isObjectIdString("65a000000000000000000001")).toBe(true);
    expect(isObjectIdString("65A00000000000000000000F")).toBe(true);
    for (const v of ["", "123", "65a00000000000000000000g", "65a0000000000000000000011", undefined, 5, {}]) expect(isObjectIdString(v)).toBe(false);
  });
});