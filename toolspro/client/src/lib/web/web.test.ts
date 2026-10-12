import { afterEach, describe, expect, it, vi } from "vitest";
import { callWebTool, WebToolError } from "./webApi";
import { failureTitle, formatBytes, formatMs, safeHttpUrl, statusMeaning } from "./format";

const realFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = realFetch;
});

function stubFetch(response: Response | Error) {
  const mock = vi.fn(async () => {
    if (response instanceof Error) throw response;
    return response;
  });
  globalThis.fetch = mock as unknown as typeof fetch;
  return mock;
}

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

describe("callWebTool", () => {
  it("posts the address as JSON and returns the data", async () => {
    const mock = stubFetch(json({ success: true, data: { status: 200 } }));
    const result = await callWebTool<{ status: number }>("status", "example.com");
    expect(result).toEqual({ status: 200 });
    const [url, init] = mock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("/api/web/status");
    expect(init.method).toBe("POST");
    expect(init.body).toBe(JSON.stringify({ url: "example.com" }));
    expect((init.headers as Record<string, string>)["Content-Type"]).toBe("application/json");
  });

  it("throws the message the server sent", async () => {
    stubFetch(json({ success: false, error: { code: "URL_NOT_ALLOWED", message: "This web address cannot be checked." } }, 400));
    const error = await callWebTool("meta", "localhost").catch((e: unknown) => e);
    expect(error).toBeInstanceOf(WebToolError);
    expect((error as WebToolError).code).toBe("URL_NOT_ALLOWED");
    expect((error as WebToolError).message).toBe("This web address cannot be checked.");
  });

  it("explains a rate limit", async () => {
    stubFetch(json({ success: false, error: { code: "TOO_MANY_REQUESTS", message: "Too many checks. Please wait a few minutes and try again." } }, 429));
    await expect(callWebTool("ping", "example.com")).rejects.toThrow("Too many checks");
  });

  it("handles an answer that is not JSON", async () => {
    stubFetch(new Response("<html>Bad gateway</html>", { status: 502 }));
    const error = (await callWebTool("snoop", "example.com").catch((e: unknown) => e)) as WebToolError;
    expect(error.code).toBe("BAD_RESPONSE");
    expect(error.message).toContain("502");
  });

  it("handles a success answer without data", async () => {
    stubFetch(json({ success: true }));
    await expect(callWebTool("snoop", "example.com")).rejects.toBeInstanceOf(WebToolError);
  });

  it("gives a friendly message when the server cannot be reached", async () => {
    stubFetch(new TypeError("Failed to fetch"));
    const error = (await callWebTool("status", "example.com").catch((e: unknown) => e)) as WebToolError;
    expect(error.code).toBe("NETWORK");
    expect(error.message).toContain("could not be reached");
  });

  it("passes an abort through unchanged", async () => {
    const controller = new AbortController();
    controller.abort();
    stubFetch(new DOMException("Aborted", "AbortError"));
    const error = await callWebTool("status", "example.com", controller.signal).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(DOMException);
  });
});

describe("format helpers", () => {
  it("formats times", () => {
    expect(formatMs(0)).toBe("0 ms");
    expect(formatMs(320.4)).toBe("320 ms");
    expect(formatMs(1500)).toBe("1.5 s");
    expect(formatMs(12400)).toBe("12 s");
    expect(formatMs(-1)).toBe("—");
    expect(formatMs(Number.NaN)).toBe("—");
  });

  it("formats sizes", () => {
    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(2048)).toBe("2.0 KB");
    expect(formatBytes(1_500_000)).toBe("1.4 MB");
    expect(formatBytes(-5)).toBe("—");
  });

  it("explains status codes", () => {
    expect(statusMeaning(404)).toContain("Not found");
    expect(statusMeaning(301)).toContain("permanently");
    expect(statusMeaning(418)).toContain("Client error");
    expect(statusMeaning(599)).toContain("Server error");
    expect(statusMeaning(222)).toBe("Success.");
    expect(statusMeaning(0)).toBe("Unknown status.");
  });

  it("only turns http and https addresses into links", () => {
    expect(safeHttpUrl("https://example.com/a")).toBe("https://example.com/a");
    expect(safeHttpUrl("http://example.com")).toBe("http://example.com/");
    expect(safeHttpUrl("javascript:alert(1)")).toBeNull();
    expect(safeHttpUrl("data:text/html,hi")).toBeNull();
    expect(safeHttpUrl("/relative")).toBeNull();
  });

  it("names failures", () => {
    expect(failureTitle("DNS_FAILED")).toContain("not found");
    expect(failureTitle("SOMETHING_NEW")).toBe("The request failed");
  });
});
