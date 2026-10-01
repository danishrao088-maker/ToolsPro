export type ToolStatus =
  | "planned"
  | "in_progress"
  | "blocked_for_review"
  | "implemented"
  | "tested"
  | "active";

export type PrivacyMode = "browser" | "server";

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon: string;
}

export type AuditGroup = "A" | "B" | "C" | "D" | "E";

export interface Tool {
  // ... pehle wali saari fields ...
  auditGroup: AuditGroup;   // feasibility group (Step 1 ka audit)
  reviewNote?: string;      // sirf blocked tools ke liye wajah
}

export interface Tool {
  id: string;
  name: string;
  slug: string;
  category: string; // Category ka slug
  description: string;
  icon: string;
  tags: string[];
  keywords: string[];
  privacyMode: PrivacyMode;
  status: ToolStatus;
}