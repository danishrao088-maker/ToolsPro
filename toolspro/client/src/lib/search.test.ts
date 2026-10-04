import { describe, expect, it } from "vitest";
import type { PublicTool } from "../types/api";
import { normalize, searchTools, sortByName } from "./search";

function makeTool(overrides: Partial<PublicTool> & { name: string }): PublicTool {
  const slug = overrides.name.toLowerCase().replace(/\s+/g, "-");
  return {
    id: slug,
    slug,
    category: "text-tools",
    description: "",
    icon: "Type",
    tags: [],
    keywords: [],
    privacyMode: "browser",
    ...overrides,
  };
}

const categoryNames = {
  "pdf-and-document-tools": "PDF and Document Tools",
  "text-tools": "Text Tools",
};

const tools = [
  makeTool({
    name: "Merge PDF",
    category: "pdf-and-document-tools",
    tags: ["pdf", "merge"],
    keywords: ["combine pdf"],
    description: "Combine several PDF files into one document.",
  }),
  makeTool({
    name: "Split PDF",
    category: "pdf-and-document-tools",
    tags: ["pdf", "split"],
    keywords: ["extract pages"],
    description: "Split a PDF into separate pages.",
  }),
  makeTool({
    name: "Text to Binary",
    tags: ["text", "binary"],
    keywords: ["ascii"],
    description: "Convert plain text into binary code.",
  }),
  makeTool({
    name: "JSON Viewer",
    tags: ["json"],
    keywords: ["pretty print"],
    description: "Format and explore JSON data.",
  }),
];

const names = (list: PublicTool[]) => list.map((t) => t.name);

describe("normalize", () => {
  it("lowercases, trims and collapses spaces", () => {
    expect(normalize("  PDF   Tools ")).toBe("pdf tools");
  });

  it("removes accents", () => {
    expect(normalize("Café")).toBe("cafe");
  });
});

describe("searchTools", () => {
  it("returns every tool for a blank query", () => {
    expect(searchTools(tools, "   ")).toHaveLength(4);
  });

  it("matches names case-insensitively", () => {
    expect(names(searchTools(tools, "JSON"))).toEqual(["JSON Viewer"]);
  });

  it("matches keywords", () => {
    expect(names(searchTools(tools, "ascii"))).toEqual(["Text to Binary"]);
  });

  it("matches tags", () => {
    expect(names(searchTools(tools, "binary"))).toEqual(["Text to Binary"]);
  });

  it("matches the category name", () => {
    expect(names(searchTools(tools, "document tools", categoryNames))).toEqual([
      "Merge PDF",
      "Split PDF",
    ]);
  });

  it("requires every search term to match", () => {
    expect(names(searchTools(tools, "merge pdf"))).toEqual(["Merge PDF"]);
    expect(searchTools(tools, "merge split")).toEqual([]);
  });

  it("ranks name matches above description matches", () => {
    const list = [
      makeTool({ name: "Alpha", description: "Helps with images" }),
      makeTool({ name: "Image Tool", description: "Does stuff" }),
    ];
    expect(names(searchTools(list, "image"))).toEqual(["Image Tool", "Alpha"]);
  });

  it("returns an empty list when nothing matches", () => {
    expect(searchTools(tools, "zzz")).toEqual([]);
  });
});

describe("sortByName", () => {
  it("sorts both ways without changing the input", () => {
    const input = [makeTool({ name: "B" }), makeTool({ name: "A" })];
    expect(names(sortByName(input, "asc"))).toEqual(["A", "B"]);
    expect(names(sortByName(input, "desc"))).toEqual(["B", "A"]);
    expect(names(input)).toEqual(["B", "A"]);
  });
});