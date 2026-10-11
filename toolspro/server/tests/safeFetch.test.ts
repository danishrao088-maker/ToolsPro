import http from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { AppError } from "../src/utils/AppError";
import { FetchFailure, createSafeFetcher } from "../src/services/safeFetch";

let server: http.Server;
let port = 0;
let hangs = 0;

beforeAll(async () => {
  server = http.createServer((req, res) => {
    const url = req.url ?? "/";
    if (url === "/ok") {
      res.writeHead(200, { "content-type": "text/html", "x-test": "yes", "set-cookie": ["a=1", "b=2"] });
      res.end("hello");
    } else if (url === "/host") {
      res.end(String(req.headers.host));
    } else if (url === "/method") {
      res.end(req.method ?? "");
    } else if (url === "/big") {
      res.writeHead(200, { "content-type": "text/plain" });
      res.end("x".repeat(5000));
    } else if (url === "/hang") {
      hangs += 1; // kabhi jawab nahi dete
    } else if (url === "/stall") {
      res.writeHead(200, { "content-type": "text/plain" });
      res.write("partial");
    } else if (url === "/a") {
      res.writeHead(302, { location: "/b" }).end("moved");
    } else if (url === "/b") {
      res.writeHead(301, { location: `http://site.test:${port}/c#frag` }).end();
    } else if (url === "/c") {
      res.writeHead(200, { "content-type": "text/html" }).end("final page");
    } else if (url === "/loop1") {
      res.writeHead(302, { location: "/loop2" }).end();
    } else if (url === "/loop2") {
      res.writeHead(302, { location: "/loop1" }).end();
    } else if (url.startsWith("/n/")) {
      res.writeHead(302, { location: `/n/${Number(url.slice(3)) + 1}` }).end();
    } else if (url === "/to-private") {
      res.writeHead(302, { location: `http://internal.test:${port}/secret` }).end();
    } else if (url === "/to-loopback") {
      res.writeHead(302, { location: "http://127.0.0.1:8080/admin" }).end();
    } else if (url === "/to-ftp") {
      res.writeHead(302, { location: "ftp://example.com/file" }).end();
    } else if (url === "/no-location") {
      res.writeHead(302).end();
    } else {
      res.writeHead(404, { "content-type": "text/plain" }).end("nope");
    }
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  port = (server.address() as AddressInfo).port;
});

afterAll(async () => {
  server.closeAllConnections();
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

const local = [{ address: "127.0.0.1", family: 4 }];

// Test ke liye: har naam 127.0.0.1 par jaata hai, siraf 10.x block hai (asli guard kuch aur test karta hai)
function testFetcher(extra: Parameters<typeof createSafeFetcher>[0] = {}) {
  return createSafeFetcher({
    ports: "any",
    isBlocked: (address) => address.startsWith("10."),
    resolve: async (host) => (host === "internal.test" ? [{ address: "10.0.0.5", family: 4 }] : local),
    ...extra,
  });
}

async function failureOf(promise: Promise<unknown>): Promise<unknown> {
  try {
    await promise;
  } catch (error) {
    return error;
  }
  throw new Error("expected a failure");
}

describe("request", () => {
  it("returns status, headers and body, and hides cookies", async () => {
    const res = await testFetcher().request(`http://site.test:${port}/ok`, { readBody: true });
    expect(res.status).toBe(200);
    expect(res.headers["x-test"]).toBe("yes");
    expect(res.headers["set-cookie"]).toBe("[hidden]");
    expect(res.body).toBe("hello");
    expect(res.bodyBytes).toBe(5);
    expect(res.truncated).toBe(false);
    expect(res.address).toBe("127.0.0.1");
    expect(res.timeMs).toBeGreaterThanOrEqual(0);
  });

  it("does not read the body unless asked", async () => {
    const res = await testFetcher().request(`http://site.test:${port}/ok`);
    expect(res.status).toBe(200);
    expect(res.body).toBe("");
  });

  it("can send a HEAD request", async () => {
    const res = await testFetcher().request(`http://site.test:${port}/method`, { method: "HEAD", readBody: true });
    expect(res.status).toBe(200);
    expect(res.body).toBe("");
  });

  it("connects to the checked address but keeps the original Host header", async () => {
    const res = await testFetcher().request(`http://pinned.test:${port}/host`, { readBody: true });
    expect(res.body).toBe(`pinned.test:${port}`);
    expect(res.address).toBe("127.0.0.1");
  });

  it("reports 404 as a normal response", async () => {
    const res = await testFetcher().request(`http://site.test:${port}/missing`, { readBody: true });
    expect(res.status).toBe(404);
    expect(res.body).toBe("nope");
  });

  it("stops reading at the size limit", async () => {
    const res = await testFetcher().request(`http://site.test:${port}/big`, { readBody: true, maxBytes: 1000 });
    expect(res.bodyBytes).toBe(1000);
    expect(res.body).toHaveLength(1000);
    expect(res.truncated).toBe(true);
  });

  it("fails with TIMEOUT when the server never answers", async () => {
    const started = Date.now();
    const error = await failureOf(testFetcher().request(`http://site.test:${port}/hang`, { timeoutMs: 300 }));
    expect(error).toBeInstanceOf(FetchFailure);
    expect((error as FetchFailure).reason).toBe("TIMEOUT");
    expect(Date.now() - started).toBeLessThan(2000);
    expect(hangs).toBeGreaterThan(0);
  });

  it("returns what it has when the body stalls after the headers", async () => {
    const res = await testFetcher().request(`http://site.test:${port}/stall`, { readBody: true, timeoutMs: 300 });
    expect(res.status).toBe(200);
    expect(res.body).toBe("partial");
    expect(res.truncated).toBe(true);
  });

  it("fails with CONNECTION_REFUSED when nothing is listening", async () => {
    const closed = http.createServer();
    await new Promise<void>((resolve) => closed.listen(0, "127.0.0.1", resolve));
    const closedPort = (closed.address() as AddressInfo).port;
    await new Promise<void>((resolve) => closed.close(() => resolve()));
    const error = await failureOf(testFetcher().request(`http://site.test:${closedPort}/`));
    expect((error as FetchFailure).reason).toBe("CONNECTION_REFUSED");
  });

  it("fails with DNS_FAILED when the name cannot be resolved", async () => {
    const throwing = testFetcher({
      resolve: async () => {
        throw Object.assign(new Error("not found"), { code: "ENOTFOUND" });
      },
    });
    expect(((await failureOf(throwing.request("http://nothing.test/"))) as FetchFailure).reason).toBe("DNS_FAILED");
    const empty = testFetcher({ resolve: async () => [] });
    expect(((await failureOf(empty.request("http://nothing.test/"))) as FetchFailure).reason).toBe("DNS_FAILED");
  });
});

describe("blocking private targets", () => {
  it("refuses when the name resolves to a private address, without connecting", async () => {
    const error = await failureOf(testFetcher().request(`http://internal.test:${port}/secret`));
    expect(error).toBeInstanceOf(AppError);
    expect((error as AppError).code).toBe("URL_NOT_ALLOWED");
  });

  it("refuses when any one of several answers is private", async () => {
    const mixed = testFetcher({
      resolve: async () => [
        { address: "93.184.216.34", family: 4 },
        { address: "10.0.0.5", family: 4 },
      ],
    });
    expect(((await failureOf(mixed.request("http://mixed.test/"))) as AppError).code).toBe("URL_NOT_ALLOWED");
  });

  it("uses the real guard by default: loopback, metadata and rebinding are refused", async () => {
    const real = createSafeFetcher();
    for (const target of ["http://127.0.0.1/", "http://localhost/", "http://[::1]/", "http://169.254.169.254/latest/meta-data/", "http://192.168.1.1/", "http://2130706433/"]) {
      const error = await failureOf(real.request(target));
      expect((error as AppError).code, target).toBe("URL_NOT_ALLOWED");
    }
    const rebinding = createSafeFetcher({ resolve: async () => [{ address: "127.0.0.1", family: 4 }] });
    expect(((await failureOf(rebinding.request("http://example.com/"))) as AppError).code).toBe("URL_NOT_ALLOWED");
  });

  it("refuses odd ports with the default settings", async () => {
    const real = createSafeFetcher({ resolve: async () => [{ address: "93.184.216.34", family: 4 }] });
    expect(((await failureOf(real.request("http://example.com:6379/"))) as AppError).code).toBe("INVALID_URL");
  });
});

describe("concurrency limit", () => {
  it("says BUSY when too many requests run at once", async () => {
    const limited = testFetcher({ maxConcurrent: 1 });
    const first = limited.request(`http://site.test:${port}/hang`, { timeoutMs: 400 }).catch((error: unknown) => error);
    await new Promise((resolve) => setTimeout(resolve, 50));
    const error = await failureOf(limited.request(`http://site.test:${port}/ok`));
    expect((error as AppError).code).toBe("BUSY");
    expect((error as AppError).statusCode).toBe(503);
    await first;
    expect((await limited.request(`http://site.test:${port}/ok`)).status).toBe(200);
  });
});

describe("follow", () => {
  it("follows redirects (relative and absolute) and reads the final page", async () => {
    const result = await testFetcher().follow(`http://site.test:${port}/a`, { readFinalBody: true });
    expect(result.stopped).toBe("done");
    expect(result.hops.map((h) => h.status)).toEqual([302, 301, 200]);
    expect(result.hops[0]!.location).toBe("/b");
    expect(result.hops[2]!.url).toBe(`http://site.test:${port}/c`);
    expect(result.final?.body).toBe("final page");
    expect(result.failure).toBeNull();
  });

  it("detects a redirect loop", async () => {
    const result = await testFetcher().follow(`http://site.test:${port}/loop1`);
    expect(result.stopped).toBe("loop");
    expect(result.hops.map((h) => h.url.endsWith("/loop1") || h.url.endsWith("/loop2"))).toEqual([true, true]);
  });

  it("stops after too many redirects", async () => {
    const result = await testFetcher().follow(`http://site.test:${port}/n/0`, { maxRedirects: 3 });
    expect(result.stopped).toBe("too_many");
    expect(result.hops).toHaveLength(4);
  });

  it("does not follow a redirect to a private address", async () => {
    const result = await testFetcher().follow(`http://site.test:${port}/to-private`);
    expect(result.stopped).toBe("blocked");
    expect(result.hops).toHaveLength(1);
    expect(result.final).toBeNull();
  });

  it("does not follow a redirect to a loopback address", async () => {
    const result = await createSafeFetcher({ ports: "any", resolve: async () => local, isBlocked: () => false }).follow(`http://site.test:${port}/to-loopback`);
    expect(result.stopped).toBe("blocked");
    expect(result.hops).toHaveLength(1);
  });

  it("does not follow a redirect to another scheme", async () => {
    const result = await testFetcher().follow(`http://site.test:${port}/to-ftp`);
    expect(result.stopped).toBe("blocked");
  });

  it("handles a redirect without a Location header", async () => {
    const result = await testFetcher().follow(`http://site.test:${port}/no-location`);
    expect(result.stopped).toBe("bad_location");
    expect(result.final?.status).toBe(302);
  });

  it("reports a failure on the first request instead of throwing", async () => {
    const result = await testFetcher({ resolve: async () => [] }).follow("http://nothing.test/");
    expect(result.stopped).toBe("failed");
    expect(result.failure?.reason).toBe("DNS_FAILED");
    expect(result.hops).toEqual([]);
  });

  it("throws for an address that is not allowed at all", async () => {
    const error = await failureOf(createSafeFetcher().follow("http://127.0.0.1/"));
    expect((error as AppError).code).toBe("URL_NOT_ALLOWED");
  });
});
