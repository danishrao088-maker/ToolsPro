import type { CategoryWithCount, PublicTool } from "../types/api";
import { apiGet } from "./api";

export function fetchTools(category?: string): Promise<PublicTool[]> {
  return apiGet<PublicTool[]>(category ? `/tools?category=${encodeURIComponent(category)}` : "/tools");
}

export function fetchCategories(): Promise<CategoryWithCount[]> {
  return apiGet<CategoryWithCount[]>("/categories");
}