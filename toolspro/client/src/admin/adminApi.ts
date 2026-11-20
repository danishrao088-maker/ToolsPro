import { ApiError } from "../services/api";
import type { ApiResponse } from "../types/api";
import type {
  AdminPostDetail,
  AdminPostSummary,
  AdminStats,
  AdminTerm,
  PageOf,
  PostListParams,
  PostPayload,
  PostStatus,
  TermKind,
  TermPayload,
} from "./types";

// Admin ke saare sawal /api/admin/... par jate hain. Login ka cookie browser khud bhejta hai (HttpOnly, JavaScript ko nazar nahi aata).

async function adminRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`/api/admin${path}`, { credentials: "same-origin", ...init });
  } catch {
    throw new ApiError("NETWORK_ERROR", "Could not reach the server. Check your connection and try again.", 0);
  }

  let body: ApiResponse<T> | null;
  try {
    body = (await res.json()) as ApiResponse<T>;
  } catch {
    body = null;
  }

  if (!res.ok || !body || !body.success) {
    const err = body && !body.success ? body.error : null;
    throw new ApiError(err?.code ?? "UNKNOWN_ERROR", err?.message ?? "Something went wrong. Please try again.", res.status, err?.details);
  }
  return body.data;
}

const json = (method: string, payload?: unknown): RequestInit => ({
  method,
  headers: { Accept: "application/json", "Content-Type": "application/json" },
  ...(payload === undefined ? {} : { body: JSON.stringify(payload) }),
});

export function queryString(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") search.set(key, String(value));
  }
  const text = search.toString();
  return text ? `?${text}` : "";
}

export const adminApi = {
  login: (email: string, password: string) => adminRequest<{ email: string }>("/login", json("POST", { email, password })),
  logout: () => adminRequest<{ signedOut: boolean }>("/logout", json("POST")),
  me: () => adminRequest<{ email: string }>("/me"),
  stats: () => adminRequest<AdminStats>("/stats"),

  listPosts: (params: PostListParams) =>
    adminRequest<PageOf<AdminPostSummary>>(
      `/posts${queryString({ page: params.page, pageSize: params.pageSize, q: params.q.trim(), status: params.status, category: params.category })}`,
    ),
  getPost: (id: string) => adminRequest<AdminPostDetail>(`/posts/${encodeURIComponent(id)}`),
  createPost: (payload: PostPayload) => adminRequest<AdminPostDetail>("/posts", json("POST", payload)),
  updatePost: (id: string, payload: PostPayload) => adminRequest<AdminPostDetail>(`/posts/${encodeURIComponent(id)}`, json("PUT", payload)),
  setPostStatus: (id: string, status: PostStatus) => adminRequest<AdminPostDetail>(`/posts/${encodeURIComponent(id)}/status`, json("PATCH", { status })),
  deletePost: (id: string) => adminRequest<{ deleted: boolean }>(`/posts/${encodeURIComponent(id)}`, json("DELETE")),

  listTerms: (kind: TermKind) => adminRequest<AdminTerm[]>(`/${kind}`),
  createTerm: (kind: TermKind, payload: TermPayload) => adminRequest<AdminTerm>(`/${kind}`, json("POST", payload)),
  updateTerm: (kind: TermKind, id: string, payload: TermPayload) => adminRequest<AdminTerm>(`/${kind}/${encodeURIComponent(id)}`, json("PUT", payload)),
  deleteTerm: (kind: TermKind, id: string) => adminRequest<{ deleted: boolean }>(`/${kind}/${encodeURIComponent(id)}`, json("DELETE")),

  // Image seedha bytes ki tarah jati hai (Content-Type: image/png...), asli naam header mein
  uploadImage: (file: File) =>
    adminRequest<{ url: string; bytes: number; type: string }>("/uploads", {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": file.type, "X-File-Name": encodeURIComponent(file.name) },
      body: file,
    }),
};
