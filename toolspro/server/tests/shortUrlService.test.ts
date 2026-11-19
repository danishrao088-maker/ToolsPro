import { describe, expect, it } from "vitest";
import { createShortUrlService, type ShortUrlRepo } from "../src/services/shortUrlService";

const NOW = new Date("2026-10-16T00:00:00.000Z");

interface Row {
  code: string;
  destination: string;
  expiresAt: Date;
  clicks: number;
}

function fakeRepo(rows: Row[] = []) {
  const calls = { insert: 0, hit: 0 };
  const repo: ShortUrlRepo = {
    async insert(doc) {
      calls.insert += 1;
      if (rows.some((row) => row.code === doc.code)) return "duplicate";
      rows.push({ ...doc, clicks: 0 });
      return "ok";
    },
    async hit(code, now) {
      calls.hit += 1;
      const row = rows.find((item) => item.code === code && item.expiresAt > now);
      if (!row) return null;
      row.clicks += 1;
      return { destination: row.destination };
    },
  };
  return { repo, rows, calls };
}

const sequence = (...codes: string[]) => {
  let index = 0;
  return () => codes[Math.min(index++, codes.length - 1)]!;
};

describe("create", () => {
  it("saves the cleaned address and returns the short link details", async () => {
    const { repo, rows } = fakeRepo();
    const service = createShortUrlService({ repo, now: () => NOW, makeCode: () => "aB3xK9p" });
    const created = await service.create("Example.com/page", []);
    expect(created).toEqual({ code: "aB3xK9p", path: "/s/aB3xK9p", destination: "https://example.com/page", expiresAt: "2027-10-16T00:00:00.000Z" });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ code: "aB3xK9p", destination: "https://example.com/page", clicks: 0 });
  });
  it("tries a new code when the first one is taken", async () => {
    const { repo, rows, calls } = fakeRepo([{ code: "taken22", destination: "https://a.example/", expiresAt: new Date("2030-01-01"), clicks: 0 }]);
    const service = createShortUrlService({ repo, now: () => NOW, makeCode: sequence("taken22", "taken22", "fresh33") });
    expect((await service.create("https://b.example/", [])).code).toBe("fresh33");
    expect(calls.insert).toBe(3);
    expect(rows).toHaveLength(2);
  });
  it("gives up with a clear error when codes keep clashing", async () => {
    const { repo, calls } = fakeRepo([{ code: "taken22", destination: "https://a.example/", expiresAt: new Date("2030-01-01"), clicks: 0 }]);
    const service = createShortUrlService({ repo, now: () => NOW, makeCode: () => "taken22", maxAttempts: 3 });
    await expect(service.create("https://b.example/", [])).rejects.toMatchObject({ code: "CODE_UNAVAILABLE", statusCode: 503 });
    expect(calls.insert).toBe(3);
  });
  it("refuses bad addresses before touching the database", async () => {
    const { repo, calls } = fakeRepo();
    const service = createShortUrlService({ repo });
    await expect(service.create("javascript:alert(1)", [])).rejects.toMatchObject({ statusCode: 400 });
    await expect(service.create("https://toolspro.com/x", ["toolspro.com"])).rejects.toMatchObject({ statusCode: 400 });
    await expect(service.create("", [])).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    expect(calls.insert).toBe(0);
  });
  it("passes database errors on", async () => {
    const repo: ShortUrlRepo = {
      insert: async () => {
        throw Object.assign(new Error("down"), { statusCode: 503, code: "DB_UNAVAILABLE" });
      },
      hit: async () => null,
    };
    await expect(createShortUrlService({ repo }).create("https://example.com/", [])).rejects.toMatchObject({ code: "DB_UNAVAILABLE" });
  });
  it("uses real random codes by default", async () => {
    const { repo } = fakeRepo();
    const service = createShortUrlService({ repo });
    const created = await service.create("https://example.com/", []);
    expect(created.code).toMatch(/^[2-9a-km-zA-HJ-NP-Z]{7}$/);
  });
});

describe("resolve", () => {
  it("returns the address and counts the click", async () => {
    const { repo, rows } = fakeRepo([{ code: "abcd234", destination: "https://example.com/x", expiresAt: new Date("2027-01-01"), clicks: 0 }]);
    const service = createShortUrlService({ repo, now: () => NOW });
    expect(await service.resolve("abcd234")).toBe("https://example.com/x");
    expect(await service.resolve("abcd234")).toBe("https://example.com/x");
    expect(rows[0]!.clicks).toBe(2);
  });
  it("returns null for unknown and expired links", async () => {
    const { repo } = fakeRepo([{ code: "old2345", destination: "https://example.com/x", expiresAt: new Date("2026-10-15"), clicks: 0 }]);
    const service = createShortUrlService({ repo, now: () => NOW });
    expect(await service.resolve("old2345")).toBeNull();
    expect(await service.resolve("nope234")).toBeNull();
  });
  it("does not ask the database about a malformed code", async () => {
    const { repo, calls } = fakeRepo();
    const service = createShortUrlService({ repo });
    for (const code of ["", "a", "ab/cd", "x".repeat(40), undefined, ["abcd"], { $ne: "" }]) expect(await service.resolve(code)).toBeNull();
    expect(calls.hit).toBe(0);
  });
});