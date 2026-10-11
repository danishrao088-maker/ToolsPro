import http from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { AppError } from "../src/utils/AppError";
import { createSafeFetcher, FetchFailure, type SafeFetcher } from "../src/services/safeFetch";
import { createWebToolService, webToolService } from "../src/services/webToolService";

const goodHtml = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>A decent page title of a good length</title>
<meta name="description" content="A description that is long enough to be a proper summary of this small test page for readers."><meta name="viewport" content="width=device-width">
<meta property="og:title" content="Shared"><meta property="og:image" content="https://example.com/i.png"></head><body><h1>Hi</h1><a href="/x">x</a></body></html>`;

let server: http.Server;
let port = 0;
let svc: ReturnType<typeof createWebToolService>;

beforeAll(async () => {
  server = http.createServer((req, res) => {
    const url = req.url ?? "/";
    const html = (status: number, body: string) => res.writeHead(status, { "content-type": "text/html; charset=utf-8" }).end(body);
    if (url === "/up") html(200, goodHtml);
    else if (url === "/error500") html(500, "<h1>boom</h1>");
    else if (url === "/gone") html(404, "<html><head><title>Not found</title></head><body>missing</body></html>");
    else if (url === "/r1") res.writeHead(302, { location: "/r2" }).end();
    else if (url === "/r2") res.writeHead(301, { location: "/up" }).end();
    else if (url === "/loop1") res.writeHead(302, { location: "/loop2" }).end();
    else if (url === "/loop2") res.writeHead(302, { location: "/loop1" }).end();
    else if (url === "/pdf") res.writeHead(200, { "content-type": "application/pdf" }).end("%PDF-1.4");
    else if (url === "/gz") res.writeHead(200, { "content-type": "text/html", "content-encoding": "gzip" }).end("not really gzip")
    else if (url === "/json") res.writeHead(200, { "content-type": "application/json" }).end("{}");
    else html(404, "nope");
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

async function errorOf(promise: Promise<unknown>): Promise<AppError> {
  try {
    await promise;
  } catch (error) {
    return error as AppError;
  }
  throw new Error("expected an error");
}

async function deadPort(): Promise<number> {
  const s = http.createServer();
  await new Promise<void>((resolve) => s.listen(0, "127.0.0.1", resolve));
  const p = (s.address() as AddressInfo).port;
  await new Promise<void>((resolve) => s.close(() => resolve()));
  return p;
}

describe("checkStatus", () => {
  it("reports status, timing and headers", async () => {
    const r = await svc.checkStatus(at("/up"));
    expect(r).toMatchObject({ reachable: true, status: 200, category: "success", secure: false, redirectsTo: null, address: "127.0.0.1" });
    if (r.reachable) expect(r.headers.map((h) => h.name)).toContain("content-type");
  });

  it("does not follow a redirect but shows where it goes", async () => {
    const r = await svc.checkStatus(at("/r2"));
    expect(r).toMatchObject({ reachable: true, status: 301, category: "redirect", redirectsTo: "/up" });
  });

  it("classifies errors", async () => {
    expect(await svc.checkStatus(at("/error500"))).toMatchObject({ status: 500, category: "server_error" });
    expect(await svc.checkStatus(at("/nothing"))).toMatchObject({ status: 404, category: "client_error" });
  });

  it("returns a failure (not an exception) when the server cannot be reached", async () => {
    const r = await svc.checkStatus(`http://site.test:${await deadPort()}/`);
    expect(r.reachable).toBe(false);
    if (!r.reachable) expect(r.failure.reason).toBe("CONNECTION_REFUSED");
  });
});

describe("checkRedirects", () => {
  it("lists every step of a chain", async () => {
    const r = await svc.checkRedirects(at("/r1"));
    expect(r.hops.map((h) => [h.status, h.kind])).toEqual([[302, "temporary"], [301, "permanent"], [200, "final"]]);
    expect(r.hops[0]!.location).toBe(at("/r2"));
    expect(r.redirectCount).toBe(2);
    expect(r.final).toMatchObject({ url: at("/up"), status: 200 });
    expect(r.stopped).toBe("done");
    expect(r.message).toBeNull();
    expect(r.notes.join(" ")).toContain("temporary");
  });

  it("explains a loop", async () => {
    const r = await svc.checkRedirects(at("/loop1"));
    expect(r.stopped).toBe("loop");
    expect(r.final).toBeNull();
    expect(r.message).toContain("loop");
  });

  it("works for a page without redirects", async () => {
    const r = await svc.checkRedirects(at("/up"));
    expect(r.redirectCount).toBe(0);
    expect(r.hops).toHaveLength(1);
    expect(r.notes).toEqual([]);
  });

  it("adds notes for http to https and www changes", async () => {
    const fake = {
      parse: (input: string) => new URL(input),
      request: async () => {
        throw new Error("not used");
      },
      follow: async () => ({
        hops: [
          { url: "http://example.com/", status: 301, statusText: "Moved", location: "https://example.com/", timeMs: 10 },
          { url: "https://example.com/", status: 301, statusText: "Moved", location: "https://www.example.com/", timeMs: 12 },
          { url: "https://www.example.com/", status: 200, statusText: "OK", location: null, timeMs: 15 },
        ],
        final: { url: "https://www.example.com/", status: 200, statusText: "OK", headers: {}, body: "", bodyBytes: 0, truncated: false, timeMs: 15, address: "1.1.1.1" },
        stopped: "done" as const,
        failure: null,
      }),
    } as unknown as SafeFetcher;
    const r = await createWebToolService(fake).checkRedirects("http://example.com");
    expect(r.notes).toEqual(["The address is moved from http to https.", "The address is moved to the www version."]);
    expect(r.totalTimeMs).toBe(37);
  });
});

describe("checkDown", () => {
  it("says up for a working page, even through redirects", async () => {
    expect(await svc.checkDown(at("/up"))).toMatchObject({ verdict: "up", status: 200, slow: false, message: "The site is up." });
    expect(await svc.checkDown(at("/r1"))).toMatchObject({ verdict: "up", finalUrl: at("/up") });
  });

  it("says down for server errors and unreachable servers", async () => {
    expect(await svc.checkDown(at("/error500"))).toMatchObject({ verdict: "down", status: 500 });
    const dead = await svc.checkDown(`http://site.test:${await deadPort()}/`);
    expect(dead).toMatchObject({ verdict: "down", status: null });
    expect(dead.failure?.reason).toBe("CONNECTION_REFUSED");
  });

  it("says reachable_with_errors for a 404 and down for a redirect loop", async () => {
    expect(await svc.checkDown(at("/nothing"))).toMatchObject({ verdict: "reachable_with_errors", status: 404 });
    expect(await svc.checkDown(at("/loop1"))).toMatchObject({ verdict: "down", status: null });
  });

  it("always carries the note about checking from our server", async () => {
    expect((await svc.checkDown(at("/up"))).note).toContain("from our server");
  });
});

describe("ping", () => {
  it("sends four requests and summarises them", async () => {
    const r = await svc.ping(at("/up"));
    expect(r.attempts).toHaveLength(4);
    expect(r).toMatchObject({ sent: 4, received: 4, lossPercent: 0 });
    expect(r.minMs!).toBeLessThanOrEqual(r.avgMs!);
    expect(r.avgMs!).toBeLessThanOrEqual(r.maxMs!);
    expect(r.attempts.every((a) => a.ok && a.status === 200)).toBe(true);
    expect(r.note).toContain("not an ICMP ping");
  });

  it("counts failures as loss", async () => {
    const r = await svc.ping(`http://site.test:${await deadPort()}/`, 3);
    expect(r).toMatchObject({ sent: 3, received: 0, lossPercent: 100, minMs: null, avgMs: null, maxMs: null });
    expect(r.attempts.every((a) => !a.ok && a.error !== null)).toBe(true);
  });
});

describe("HTML tools", () => {
  it("analyses meta tags, Open Graph, the page and the SEO score of a real page", async () => {
    const meta = await svc.analyzeMeta(at("/up"));
    expect(meta.checks.find((c) => c.id === "title")?.level).toBe("good");
    const og = await svc.analyzeOpenGraph(at("/up"));
    expect(og.preview.title).toBe("Shared");
    const snoop = await svc.snoop(at("/up"));
    expect(snoop).toMatchObject({ status: 200, title: "A decent page title of a good length", language: "en" });
    expect(snoop.links.total).toBe(1);
    const seo = await svc.seoScore(at("/up"));
    expect(seo.score).toBeGreaterThan(50);
    expect(seo.checks.find((c) => c.id === "https")?.points).toBe(0); // test server is http
  });

  it("follows redirects and reports the final address", async () => {
    const snoop = await svc.snoop(at("/r1"));
    expect(snoop.url).toBe(at("/up"));
    expect(snoop.redirects).toBe(2);
  });

  it("still analyses a 404 page and scores it low on 'Page loads'", async () => {
    const seo = await svc.seoScore(at("/gone"));
    expect(seo.checks.find((c) => c.id === "status")?.points).toBe(0);
    expect((await svc.snoop(at("/gone"))).status).toBe(404);
  });

  it("refuses things that are not web pages", async () => {
    for (const path of ["/pdf", "/json"]) {
      const error = await errorOf(svc.analyzeMeta(at(path)));
      expect(error).toMatchObject({ statusCode: 422, code: "NOT_HTML" });
    }
  });

  it("refuses compressed answers it did not ask for", async () => {
    expect(await errorOf(svc.analyzeMeta(at("/gz")))).toMatchObject({ statusCode: 422, code: "UNSUPPORTED_ENCODING" });
  });

  it("explains redirect loops and unreachable sites", async () => {
    expect(await errorOf(svc.snoop(at("/loop1")))).toMatchObject({ statusCode: 422, code: "REDIRECT_PROBLEM" });
    expect(await errorOf(svc.snoop(`http://site.test:${await deadPort()}/`))).toMatchObject({ statusCode: 502, code: "SITE_UNREACHABLE" });
  });
});

describe("the real service refuses private targets", () => {
  it("rejects local addresses for every tool", async () => {
    const targets = ["http://127.0.0.1/", "localhost", "http://169.254.169.254/", "http://[::1]/", "http://10.0.0.1/"];
    const calls: ((url: string) => Promise<unknown>)[] = [
      (u) => webToolService.checkStatus(u),
      (u) => webToolService.checkRedirects(u),
      (u) => webToolService.checkDown(u),
      (u) => webToolService.ping(u),
      (u) => webToolService.analyzeMeta(u),
      (u) => webToolService.analyzeOpenGraph(u),
      (u) => webToolService.snoop(u),
      (u) => webToolService.seoScore(u),
    ];
    for (const call of calls) {
      for (const target of targets) {
        const error = await errorOf(call(target));
        expect(error, target).toBeInstanceOf(AppError);
        expect(error.statusCode).toBe(400);
      }
    }
  });
});

describe("a failing fetcher", () => {
  it("lets unexpected errors through", async () => {
    const broken = { parse: (i: string) => new URL(i), request: async () => { throw new TypeError("bug"); }, follow: async () => { throw new TypeError("bug"); } } as unknown as SafeFetcher;
    await expect(createWebToolService(broken).checkStatus("https://example.com")).rejects.toThrow("bug");
    expect(new FetchFailure("TIMEOUT", "x", 1).reason).toBe("TIMEOUT");
  });
});
