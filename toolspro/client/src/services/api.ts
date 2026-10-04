import type { ApiResponse } from "../types/api";

export class ApiError extends Error {
  code: string;
  status: number;
  details?: Record<string, string[]>;

  constructor(code: string, message: string, status: number, details?: Record<string, string[]>) {
    super(message);
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

async function request<T>(path: string, init: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`/api${path}`, init);
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
    throw new ApiError(
      err?.code ?? "UNKNOWN_ERROR",
      err?.message ?? "Something went wrong. Please try again.",
      res.status,
      err?.details
    );
  }
  return body.data;
}

export function apiGet<T>(path: string): Promise<T> {
  return request<T>(path, { headers: { Accept: "application/json" } });
}

export function apiPost<T>(path: string, payload: unknown): Promise<T> {
  return request<T>(path, {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export function getErrorMessage(error: unknown): string {
  return error instanceof ApiError ? error.message : "Something went wrong. Please try again.";
}