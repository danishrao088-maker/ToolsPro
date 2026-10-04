import { describe, expect, it } from "vitest";
import { generateOpenGraph, type OpenGraphInput } from "./openGraph";
import { error, message, output } from "./testHelpers";

const base: OpenGraphInput = {
  title: "My Page",
  description: "",
  type: "website",
  url: "https://example.com/page",
  imageUrl: "",
  imageAlt: "",
  siteName: "",
};

describe("generateOpenGraph", () => {
  it("builds the required tags", () => {
    expect(output(generateOpenGraph(base))).toBe(
      [
        '<meta property="og:title" content="My Page">',
        '<meta property="og:type" content="website">',
        '<meta property="og:url" content="https://example.com/page">',
      ].join("\n")
    );
  });

  it("adds the optional tags in order", () => {
    const out = output(
      generateOpenGraph({
        ...base,
        type: "article",
        description: "Desc",
        imageUrl: "https://example.com/img.png",
        imageAlt: "A picture",
        siteName: "Example",
      })
    );
    expect(out).toBe(
      [
        '<meta property="og:title" content="My Page">',
        '<meta property="og:type" content="article">',
        '<meta property="og:url" content="https://example.com/page">',
        '<meta property="og:description" content="Desc">',
        '<meta property="og:image" content="https://example.com/img.png">',
        '<meta property="og:image:alt" content="A picture">',
        '<meta property="og:site_name" content="Example">',
      ].join("\n")
    );
  });

  it("escapes special characters", () => {
    const out = output(generateOpenGraph({ ...base, title: 'A "quoted" <title>' }));
    expect(out).toContain('content="A &quot;quoted&quot; &lt;title&gt;"');
  });

  it("requires a title and a page address", () => {
    expect(error(generateOpenGraph({ ...base, title: "" }))).toBe("Enter a title.");
    expect(error(generateOpenGraph({ ...base, url: "" }))).toContain("Page URL");
  });

  it("rejects an invalid page or image address", () => {
    expect(error(generateOpenGraph({ ...base, url: "javascript:alert(1)" }))).toContain("Page URL");
    expect(error(generateOpenGraph({ ...base, imageUrl: "img.png" }))).toContain("Image URL");
  });

  it("rejects an image description without an image", () => {
    expect(error(generateOpenGraph({ ...base, imageAlt: "A picture" }))).toContain("image");
  });

  it("notes when there is no image", () => {
    expect(message(generateOpenGraph(base))).toContain("No image");
    expect(message(generateOpenGraph({ ...base, imageUrl: "https://example.com/i.png" }))).not.toContain("No image");
  });
});