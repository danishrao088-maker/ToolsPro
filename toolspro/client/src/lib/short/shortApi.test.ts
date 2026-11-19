import { afterEach, describe, expect, it, vi } from "vitest";
import { createShortLink } from "./shortApi";

const LINK = { code: "abcd234", path: "/s/abcd234", destination: "https://example.com/", expiresAt: "2027-10-16T00:00:00.000Z" };

function stubFetch(response: Response | Error) {
  const fetchMock = vi.fn(async () => {
    if (response instanceof Error) throw response;
    return response.clone(); // ek Response do baar parha nahi ja sakta
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}
const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
const failure = async (run: () => Promise<unknown>) => run().then(() => null, (error: { code?: string; message: string }) => error);

afterEach(() => vi.unstubAllGlobals());

describe("createShortLink", () => {
  it("posts the address and returns the link", async () => {
    const fetchMock = stubFetch(json(201, { success: true, data: LINK }));
    expect(await createShortLink("example.com")).toEqual(LINK);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("/api/short");
    expect(init.method).toBe("POST");
    expect(JSON.parse(String(init.body))).toEqual({ url: "example.com" });
  });
  it("shows the server's message when the address is refused", async () => {
    stubFetch(json(400, { success: false, error: { code: "INVALID_URL", message: "Use a domain name, not an IP address." } }));
    expect(await failure(() => createShortLink("http://1.2.3.4"))).toMatchObject({ code: "INVALID_URL", message: "Use a domain name, not an IP address." });
  });
  it("handles a rate limit and an unavailable database", async () => {
    stubFetch(json(429, { success: false, error: { code: "RATE_LIMITED", message: "Try again later." } }));
    expect(await failure(() => createShortLink("example.com"))).toMatchObject({ code: "RATE_LIMITED" });
    stubFetch(json(503, { success: false, error: { code: "DB_UNAVAILABLE", message: "Not available." } }));
    expect(await failure(() => createShortLink("example.com"))).toMatchObject({ code: "DB_UNAVAILABLE" });
  });
  it("copes with answers that are not JSON or not complete", async () => {
    stubFetch(new Response("<html>bad gateway</html>", { status: 502 }));
    expect(await failure(() => createShortLink("example.com"))).toMatchObject({ code: "BAD_RESPONSE" });
    stubFetch(json(201, { success: true, data: { code: "abcd234" } }));
    expect(await failure(() => createShortLink("example.com"))).toMatchObject({ code: "BAD_RESPONSE" });
  });
  it("reports a network failure, but passes an abort through", async () => {
    stubFetch(new TypeError("fetch failed"));
    expect(await failure(() => createShortLink("example.com"))).toMatchObject({ code: "NETWORK" });
    const controller = new AbortController();
    controller.abort();
    const aborted = new DOMException("aborted", "AbortError");
    stubFetch(aborted);
    expect(await failure(() => createShortLink("example.com", controller.signal))).toBe(aborted);
  });
});