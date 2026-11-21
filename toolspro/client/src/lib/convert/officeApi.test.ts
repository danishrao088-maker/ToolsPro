import { afterEach, describe, expect, it, vi } from "vitest";
import { convertOfficeToPdf } from "./officeApi";

const file = new File(["data"], "My Report.docx");

function stubFetch(response: Response | Error) {
  const fetchMock = vi.fn(async () => {
    if (response instanceof Error) throw response;
    return response.clone(); // ek Response do baar parha nahi ja sakta
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}
const pdf = (body = "%PDF-1.7 x") => new Response(body, { status: 200, headers: { "Content-Type": "application/pdf" } });
const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
const failure = async (run: () => Promise<unknown>) => run().then(() => null, (error: { code?: string; message: string }) => error);

afterEach(() => vi.unstubAllGlobals());

describe("convertOfficeToPdf", () => {
  it("sends the raw file with its encoded name and returns the PDF", async () => {
    const fetchMock = stubFetch(pdf());
    const blob = await convertOfficeToPdf("word", file);
    expect(blob.type).toBe("application/pdf");
    expect(await blob.text()).toBe("%PDF-1.7 x");
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("/api/convert/word-to-pdf");
    expect(init.method).toBe("POST");
    expect(init.body).toBe(file);
    expect(init.headers).toEqual({ "Content-Type": "application/octet-stream", "X-File-Name": "My%20Report.docx" });
  });
  it("uses the endpoint of each tool", async () => {
    const fetchMock = stubFetch(pdf());
    await convertOfficeToPdf("excel", new File(["x"], "a.xlsx"));
    await convertOfficeToPdf("powerpoint", new File(["x"], "a.pptx"));
    expect(fetchMock.mock.calls.map((call) => (call as unknown as [string])[0])).toEqual(["/api/convert/excel-to-pdf", "/api/convert/powerpoint-to-pdf"]);
  });
  it("turns the server's JSON error into a readable error", async () => {
    stubFetch(json(422, { success: false, error: { code: "CONVERT_FAILED", message: "The file could not be converted." } }));
    expect(await failure(() => convertOfficeToPdf("word", file))).toMatchObject({ code: "CONVERT_FAILED", message: "The file could not be converted." });
  });
  it("explains a 413 from a proxy that sends no JSON", async () => {
    stubFetch(new Response("<html>too big</html>", { status: 413 }));
    expect(await failure(() => convertOfficeToPdf("word", file))).toMatchObject({ code: "FILE_TOO_LARGE" });
  });
  it("handles other unexpected answers", async () => {
    stubFetch(new Response("oops", { status: 502 }));
    expect(await failure(() => convertOfficeToPdf("word", file))).toMatchObject({ code: "BAD_RESPONSE" });
    stubFetch(new Response("not a pdf", { status: 200, headers: { "Content-Type": "text/plain" } }));
    expect(await failure(() => convertOfficeToPdf("word", file))).toMatchObject({ code: "BAD_RESPONSE" });
  });
  it("rejects an empty PDF", async () => {
    stubFetch(pdf(""));
    expect(await failure(() => convertOfficeToPdf("word", file))).toMatchObject({ code: "BAD_RESPONSE" });
  });
  it("reports a network failure, but passes an abort through", async () => {
    stubFetch(new TypeError("fetch failed"));
    expect(await failure(() => convertOfficeToPdf("word", file))).toMatchObject({ code: "NETWORK" });
    const controller = new AbortController();
    controller.abort();
    const aborted = new DOMException("aborted", "AbortError");
    stubFetch(aborted);
    expect(await failure(() => convertOfficeToPdf("word", file, controller.signal))).toBe(aborted);
  });
});