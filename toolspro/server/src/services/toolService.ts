import { categories } from "../data/categories";
import { tools } from "../data/tools";
import type { Category, Tool } from "../types/tool";

export function getActiveTools(categorySlug?: string): Tool[] {
  return tools.filter(
    (t) => t.status === "active" && (!categorySlug || t.category === categorySlug)
  );
}

export function getCategoriesWithCounts(): (Category & { toolCount: number })[] {
  const active = getActiveTools();
  return categories.map((c) => ({
    ...c,
    toolCount: active.filter((t) => t.category === c.slug).length,
  }));
}   