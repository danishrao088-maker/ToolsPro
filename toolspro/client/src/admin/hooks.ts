import { useEffect } from "react";
import { useQuery, type QueryClient } from "@tanstack/react-query";
import { ApiError } from "../services/api";
import { adminApi } from "./adminApi";
import type { TermKind } from "./types";

export const ME_KEY = ["admin", "me"] as const;

// 4xx (galat login, na-maujood post...) dobara try karne se theek nahi hota; sirf network/server ki ghalti par ek baar
export const adminQueryDefaults = {
  refetchOnWindowFocus: false,
  retry: (failureCount: number, error: unknown) => !(error instanceof ApiError && error.status >= 400 && error.status < 500) && failureCount < 1,
};

// Login hai? Login nahi to server 401 deta hai, wo "ghalti" nahi, bas jawab hai: null
export async function fetchSession(): Promise<{ email: string } | null> {
  try {
    return await adminApi.me();
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) return null;
    throw error;
  }
}

// Admin screens search engines ko na dikhein (server bhi X-Robots-Tag bhejta hai)
export function useNoIndex(): void {
  useEffect(() => {
    const meta = document.createElement("meta");
    meta.name = "robots";
    meta.content = "noindex, nofollow";
    document.head.appendChild(meta);
    return () => meta.remove();
  }, []);
}

export function useAdminTitle(title: string): void {
  useEffect(() => {
    document.title = `${title} | ToolsPro Admin`;
  }, [title]);
}

export function useTerms(kind: TermKind) {
  return useQuery({ queryKey: ["admin", "terms", kind], queryFn: () => adminApi.listTerms(kind), staleTime: 60_000, ...adminQueryDefaults });
}

// Kuch badalne ke baad lists, ginti aur categories/tags ki post-count dobara mangwao (login wali query ko chhor kar)
export function refreshAdminData(queryClient: QueryClient): Promise<void> {
  return queryClient.invalidateQueries({ queryKey: ["admin"], predicate: (query) => query.queryKey[1] !== "me" });
}
