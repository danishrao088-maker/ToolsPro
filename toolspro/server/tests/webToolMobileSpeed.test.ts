import http from "node:http";
import type { AddressInfo } from "node:net";
import zlib from "node:zlib";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createSafeFetcher } from "../src/services/safeFetch";
import { createWebToolService } from "../src/services/webToolService";

const filler = "<p>Some words to make this page a little bigger than a tiny test page.</p>".repeat(40);
const mobilePage = (head: string) => `<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width, initial-scale=1">${head}</head><body><h1>Hi</h1>${filler}</body></html>`;

let server: http.Server;
let port = 0;
let svc: ReturnType<typeof createWebToolService>;
let cssRequests: string[] = [];

beforeAll(async () => {
  server = http.createServer((req, res) => {
    const url = req.url ?? "/";
    const html = (body: string, headers: Record<string, string> = {}) => res.writeHead(200, { "content-type": "text/html; charset=utf-8", ...headers }).end(body);
    if (url.endsWith(".css")) cssRequests.push(url);
    if (url === "/m") html(mobilePage('<link rel="stylesheet" href="/s.css"><link rel="stylesheet" href="/small.css">'));
    else if (url === "/s.css") res.writeHead(200, { "content-type": "text/css" }).end("@media (max-width: 600px) { .a { display: none } }");
    else if (url === "/small.css") res.writeHead(200, { "content-type": "text/css" }).end(".x { font-size: 8px } .y { font-size: 9px }");
    else if (url === "/broken") html(mobilePage('<link rel="stylesheet" href="/missing.css">'));
    else if (url === "/nocss") html(mobilePage(""));
    else if (url === "/gz") {
      const wants = String(req.headers["accept-encoding"] ?? "").includes("gzip");
      if (wants) res.writeHead(200, { "content-type": "text/html", "content-encoding": "gzip", "cache-control": "max-age=60" }).end(zlib.gzipSync(mobilePage("")));
      else html(mobilePage(""), { "cache-control": "max-age=60" });
    } else if (url === "/plain") html(mobilePage(""));
    else if (url === "/pdf") res.writeHead(200, { "content-type": "application/pdf" }).end("%PDF-1.4");
    else res.writeHead(404, { "content-type": "text/html" }).end("<html><body>nope</body></html>");
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  port = (server.address() as AddressInfo).port;
  svc = createWebToolService(createSafeFetcher({ ports: "any", isBlocked: () => false, resolve: async () => [{ address: "127.0.0.1", family: 4 }] }));
});

afterAll(async () => {
  server.closeAllConnections();
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

const at = (path: string) => `http://site.test:${port}${path}`;
const find = (result: { checks: { id: string; points: number; message: string }[] }, id: string) => result.checks.find((c) => c.id === id)!;

describe("mobileFriendly", () => {
  it("reads linked stylesheets for media queries and small text", async () => {
    cssRequests = [];
    const out = await svc.mobileFriendly(at("/m"));
    expect(find(out, "responsive").points).toBe(15);
    expect(find(out, "font-size").points).toBe(5);
    expect(find(out, "viewport").points).toBe(30);
    expect(cssRequests.sort()).toEqual(["/s.css", "/small.css"]);
    expect(out.url).toBe(at("/m"));
  });
  it("carries on when a stylesheet cannot be read", async () => {
    const out = await svc.mobileFriendly(at("/broken"));
    expect(find(out, "responsive").points).toBe(8);
    expect(find(out, "responsive").message).toContain("0 of 1");
  });
  it("works for a page with no stylesheet", async () => {
    const out = await svc.mobileFriendly(at("/nocss"));
    expect(out.verdict).toBe("good");
  });
  it("refuses things that are not web pages", async () => {
    await expect(svc.mobileFriendly(at("/pdf"))).rejects.toMatchObject({ code: "NOT_HTML" });
  });
});

describe("pageSpeed", () => {
  it("sees that the server compresses", async () => {
    const out = await svc.pageSpeed(at("/gz"));
    expect(find(out, "compression").points).toBe(10);
    expect(find(out, "compression").message).toContain("gzip");
    expect(find(out, "caching").points).toBe(5);
  });
  it("sees when the server does not compress", async () => {
    const out = await svc.pageSpeed(at("/plain"));
    expect(find(out, "compression").points).toBe(0);
    expect(find(out, "caching").points).toBe(0);
  });
  it("returns a score out of 100 with the honest note", async () => {
    const out = await svc.pageSpeed(at("/gz"));
    expect(out.score).toBeGreaterThan(0);
    expect(out.score).toBeLessThanOrEqual(100);
    expect(out.note).toContain("Core Web Vitals");
  });
  it("refuses private addresses with the real fetcher", async () => {
    await expect(createWebToolService().pageSpeed("http://127.0.0.1/")).rejects.toMatchObject({ code: "URL_NOT_ALLOWED" });
    await expect(createWebToolService().mobileFriendly("localhost")).rejects.toBeDefined();
  });
});