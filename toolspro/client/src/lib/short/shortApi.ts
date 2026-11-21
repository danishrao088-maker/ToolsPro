import { WebToolError } from "../web/webApi";

export interface ShortLink {
  code: string;
  path: string;
  destination: string;
  expiresAt: string;
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null; // JSON nahi tha (jaise proxy ka HTML page)
  }
}

function errorFrom(payload: unknown, status: number): WebToolError {
  const error = (payload as { error?: { code?: unknown; message?: unknown } } | null)?.error;
  if (error && typeof error.message === "string" && error.message !== "") {
    return new WebToolError(typeof error.code === "string" ? error.code : "ERROR", error.message);
  }
  return new WebToolError("BAD_RESPONSE", `The server sent an unexpected answer (status ${status}). Please try again.`);
}

// Server ko address bhejta hai aur chhota link wapis leta hai
export async function createShortLink(address: string, signal?: AbortSignal): Promise<ShortLink> {
  let response: Response;
  try {
    response = await fetch("/api/short", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: address }),
      signal,
    });
  } catch (error) {
    if (signal?.aborted) throw error;
    throw new WebToolError("NETWORK", "The server could not be reached. Check your connection and try again.");
  }

  const payload = await readJson(response);
  const body = payload as { success?: unknown; data?: Partial<ShortLink> } | null;
  const data = body?.data;
  if (response.ok && body?.success === true && data && typeof data.code === "string" && typeof data.path === "string" && typeof data.destination === "string" && typeof data.expiresAt === "string") {
    return { code: data.code, path: data.path, destination: data.destination, expiresAt: data.expiresAt };
  }
  throw errorFrom(payload, response.status);
}