export type ApiResponse<T> =
  | { success: true; data: T }
  | { success: false; error: { code: string; message: string; details?: Record<string, string[]> } };

export interface PublicTool {
  id: string;
  name: string;
  slug: string;
  category: string;
  description: string;
  icon: string;
  tags: string[];
  keywords: string[];
  privacyMode: "browser" | "server";
}

export interface CategoryWithCount {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon: string;
  toolCount: number;
}