import { describe, expect, it } from "vitest";
import { generateTwitterCard, type TwitterCardInput } from "./twitterCard";
import { error, message, output } from "./testHelpers";

const base: TwitterCardInput = {
  card: "summary",
  title: "My Page",
  description: "",
  imageUrl: "",
  imageAlt: "",
  site: "",
  creator: "",
};

describe("generateTwitterCard", () => {
  it("builds the basic tags", () => {
    expect(output(generateTwitterCard(base))).toBe(
      ['<meta name="twitter:card" content="summary">', '<meta name="twitter:title" content="My Page">'].join("\n")
    );
  });

  it("adds every optional tag and normalizes handles", () => {
    const out = output(
      generateTwitterCard({
        ...base,
        card: "summary_large_image",
        description: "Desc",
        imageUrl: "https://example.com/img.png",
        imageAlt: "A picture",
        site: "example",
        creator: "@ali_1",
      })
    );
    expect(out).toBe(
      [
        '<meta name="twitter:card" content="summary_large_image">',
        '<meta name="twitter:title" content="My Page">',
        '<meta name="twitter:description" content="Desc">',
        '<meta name="twitter:image" content="https://example.com/img.png">',
        '<meta name="twitter:image:alt" content="A picture">',
        '<meta name="twitter:site" content="@example">',
        '<meta name="twitter:creator" content="@ali_1">',
      ].join("\n")
    );
  });

  it("rejects invalid handles", () => {
    expect(error(generateTwitterCard({ ...base, site: "bad handle!" }))).toContain("Site handle");
    expect(error(generateTwitterCard({ ...base, creator: "a".repeat(16) }))).toContain("Creator handle");
  });

  it("rejects an image description without an image", () => {
    expect(error(generateTwitterCard({ ...base, imageAlt: "A picture" }))).toContain("image");
  });

  it("requires a title", () => {
    expect(error(generateTwitterCard({ ...base, title: "" }))).toBe("Enter a title.");
  });

  it("escapes special characters", () => {
    const out = output(generateTwitterCard({ ...base, title: 'A "quoted" <title>' }));
    expect(out).toContain('content="A &quot;quoted&quot; &lt;title&gt;"');
  });

  it("mentions a long title in the message", () => {
    expect(message(generateTwitterCard({ ...base, title: "a".repeat(71) }))).toContain("71 characters");
    expect(message(generateTwitterCard(base))).not.toContain("cut off");
  });
});