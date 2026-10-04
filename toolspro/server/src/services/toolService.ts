import { categories } from "../data/categories";
import { tools } from "../data/tools";
import type { Category, Tool } from "../types/tool";

export type PublicTool = Omit<Tool, "status" | "auditGroup" | "reviewNote">;

function toPublicTool(t: Tool): PublicTool {
  return {
    id: t.id,
    name: t.name,
    slug: t.slug,
    category: t.category,
    description: t.description,
    icon: t.icon,
    tags: t.tags,
    keywords: t.keywords,
    privacyMode: t.privacyMode,
  };
}

export function getActiveTools(categorySlug?: string): PublicTool[] {
  return tools
    .filter((t) => t.status === "active" && (!categorySlug || t.category === categorySlug))
    .map(toPublicTool);
}

export function getCategoriesWithCounts(): (Category & { toolCount: number })[] {
  const active = getActiveTools();
  return categories.map((c) => ({
    ...c,
    toolCount: active.filter((t) => t.category === c.slug).length,
  }));
}