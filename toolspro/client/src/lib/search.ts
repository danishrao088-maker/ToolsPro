import type { PublicTool } from "../types/api";

export type CategoryNames = Record<string, string>;

export function normalize(text: string): string {
  return text
    .normalize("NFKD")
    .replace(/\p{M}/gu, "") // accents hata do: "café" -> "cafe"
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

// 0 ka matlab: ye tool match nahi karta
function scoreTool(tool: PublicTool, terms: string[], categoryName: string): number {
  const name = normalize(tool.name);
  const description = normalize(tool.description);
  const category = normalize(categoryName);
  const tags = tool.tags.map(normalize);
  const keywords = tool.keywords.map(normalize);

  let total = 0;
  for (const term of terms) {
    const best = Math.max(
      name === term ? 100 : 0,
      name.startsWith(term) ? 80 : 0,
      name.includes(term) ? 60 : 0,
      tags.some((t) => t.includes(term)) ? 40 : 0,
      keywords.some((k) => k.includes(term)) ? 40 : 0,
      category.includes(term) ? 25 : 0,
      description.includes(term) ? 15 : 0
    );
    if (best === 0) return 0; // har lafz kisi na kisi field mein hona chahiye
    total += best;
  }
  return total;
}

export function searchTools(
  tools: PublicTool[],
  query: string,
  categoryNames: CategoryNames = {}
): PublicTool[] {
  const terms = normalize(query).split(" ").filter(Boolean);
  if (terms.length === 0) return tools;

  return tools
    .map((tool) => ({ tool, score: scoreTool(tool, terms, categoryNames[tool.category] ?? "") }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.tool.name.localeCompare(b.tool.name))
    .map((entry) => entry.tool);
}

export function sortByName(tools: PublicTool[], direction: "asc" | "desc"): PublicTool[] {
  const sorted = [...tools].sort((a, b) => a.name.localeCompare(b.name));
  return direction === "asc" ? sorted : sorted.reverse();
}