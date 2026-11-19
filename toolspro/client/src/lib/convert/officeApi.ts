import { WebToolError } from "../web/webApi";
import { OFFICE_TOOLS, type OfficeToolId } from "./officeCore";

function errorFrom(payload: unknown, status: number): WebToolError {
  const error = (payload as { error?: { code?: unknown; message?: unknown } } | null)?.error;
  if (error && typeof error.message === "string" && error.message !== "") {
    return new WebToolError(typeof error.code === "string" ? error.code : "ERROR", error.message);
  }
  if (status === 413) return new WebToolError("FILE_TOO_LARGE", "The file is too large to upload.");
  return new WebToolError("BAD_RESPONSE", `The server sent an unexpected answer (status ${status}). Please try again.`);
}
async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null; // JSON nahi tha (jaise proxy ka HTML page)
  }
}

// File ko seedha bytes ki shakal mein bhejta hai (naam header mein) aur PDF wapis leta hai.
export async function convertOfficeToPdf(tool: OfficeToolId, file: File, signal?: AbortSignal): Promise<Blob> {
  let response: Response;
  try {
    response = await fetch(`/api/convert/${OFFICE_TOOLS[tool].endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/octet-stream", "X-File-Name": encodeURIComponent(file.name) },
      body: file,
      signal,
    });
  } catch (error) {
    if (signal?.aborted) throw error;
    throw new WebToolError("NETWORK", "The server could not be reached. Check your connection and try again.");
  }

  const type = response.headers.get("content-type") ?? "";
  if (response.ok && type.includes("application/pdf")) {
    const blob = await response.blob();
    if (blob.size > 0) return new Blob([blob], { type: "application/pdf" });
    throw new WebToolError("BAD_RESPONSE", "The server sent an empty file. Please try again.");
  }

      throw errorFrom(await readJson(response), response.status);
}