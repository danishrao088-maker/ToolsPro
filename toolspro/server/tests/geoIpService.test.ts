import { describe, expect, it } from "vitest";
import { createGeoIpService } from "../src/services/geoIpService";
import type { GeoReader } from "../src/services/geoIp";

const GOOGLE = {
  continent: { code: "NA", names: { en: "North America" } },
  country: { iso_code: "US", names: { en: "United States" } },
  subdivisions: [{ names: { en: "California" } }],
  city: { names: { en: "Mountain View" } },
  location: { latitude: 37.4, longitude: -122.08 },
};
const reader = (records: Record<string, unknown>): GeoReader => ({
  get: (ip) => records[ip] ?? null,
  metadata: { buildEpoch: new Date("2026-10-01T00:00:00Z") },
});

function make(
  records: Record<string, unknown> = {
    "8.8.8.8": GOOGLE,
    "2606:4700::1111": GOOGLE,
  },
  hosts: Record<string, string[]> = {},
) {
  const calls = { load: 0, resolve: [] as string[] };
  const service = createGeoIpService({
    loadReader: async () => {
      calls.load += 1;
      return reader(records);
    },
    resolve: async (host) => {
      calls.resolve.push(host);
      const found = hosts[host];
      if (!found) throw new Error("ENOTFOUND");
      return found;
    },
  });
  return { service, calls };
}

describe("lookup by IP", () => {
  it("finds an IPv4 address", async () => {
    const { service } = make();
    expect(await service.lookup("8.8.8.8", "")).toMatchObject({
      found: true,
      query: "8.8.8.8",
      ip: "8.8.8.8",
      ipVersion: 4,
      resolvedFrom: null,
      country: "United States",
      countryCode: "US",
      region: "California",
      city: "Mountain View",
      latitude: 37.4,
      longitude: -122.08,
      databaseDate: "2026-10-01T00:00:00.000Z",
    });
  });
  it("finds an IPv6 address and an IPv4-mapped one", async () => {
    const { service } = make();
    expect(await service.lookup("2606:4700::1111", "")).toMatchObject({
      found: true,
      ipVersion: 6,
    });
    expect(await service.lookup("::ffff:8.8.8.8", "")).toMatchObject({
      found: true,
      ip: "8.8.8.8",
      ipVersion: 4,
    });
  });
  it("says so when the database has no record", async () => {
    const { service } = make();
    expect(await service.lookup("1.1.1.1", "")).toMatchObject({
      found: false,
      reason: "NOT_IN_DATABASE",
      ip: "1.1.1.1",
    });
  });
  it("never looks up private or reserved addresses", async () => {
    const { service, calls } = make();
    for (const ip of [
      "127.0.0.1",
      "10.0.0.5",
      "192.168.1.1",
      "169.254.169.254",
      "::1",
      "fe80::1",
      "fc00::1",
    ]) {
      expect(await service.lookup(ip, "")).toMatchObject({
        found: false,
        reason: "PRIVATE_ADDRESS",
      });
    }
    expect(calls.load).toBe(0);
  });
  it("rejects input that is not an IP or domain", async () => {
    const { service } = make();
    await expect(service.lookup("not an ip", "")).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
      statusCode: 400,
    });
    await expect(service.lookup("localhost", "")).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
    });
  });
});

describe("lookup by domain", () => {
  it("resolves the domain and prefers a public IPv4", async () => {
    const { service, calls } = make(undefined, {
      "example.com": ["2606:4700::1111", "8.8.8.8"],
    });
    expect(await service.lookup("https://Example.com/page", "")).toMatchObject({
      found: true,
      ip: "8.8.8.8",
      query: "example.com",
      resolvedFrom: "example.com",
    });
    expect(calls.resolve).toEqual(["example.com"]);
  });
  it("uses IPv6 when that is all there is", async () => {
    const { service } = make(undefined, {
      "v6.example.com": ["2606:4700::1111"],
    });
    expect(await service.lookup("v6.example.com", "")).toMatchObject({
      found: true,
      ipVersion: 6,
    });
  });
  it("skips private answers when a public one exists", async () => {
    const { service } = make(undefined, {
      "mixed.example.com": ["10.0.0.1", "8.8.8.8"],
    });
    expect(await service.lookup("mixed.example.com", "")).toMatchObject({
      found: true,
      ip: "8.8.8.8",
    });
  });
  it("refuses a domain that only points to a private address", async () => {
    const { service, calls } = make(undefined, {
      "internal.example.com": ["127.0.0.1"],
    });
    expect(await service.lookup("internal.example.com", "")).toMatchObject({
      found: false,
      reason: "PRIVATE_ADDRESS",
      ip: "127.0.0.1",
    });
    expect(calls.load).toBe(0);
  });
  it("says when the domain cannot be found", async () => {
    const { service } = make();
    expect(await service.lookup("missing.example.com", "")).toMatchObject({
      found: false,
      reason: "NOT_FOUND",
      ip: null,
    });
  });
});

describe("the visitor's own address", () => {
  it("uses the client address when the input is empty", async () => {
    const { service } = make();
    expect(await service.lookup("", "8.8.8.8")).toMatchObject({
      found: true,
      ip: "8.8.8.8",
      query: "8.8.8.8",
    });
    expect(await service.lookup("  ", "::ffff:8.8.8.8")).toMatchObject({
      found: true,
      ip: "8.8.8.8",
    });
  });
  it("explains a local address instead of guessing", async () => {
    const { service } = make();
    expect(await service.lookup("", "::1")).toMatchObject({
      found: false,
      reason: "PRIVATE_ADDRESS",
    });
  });
  it("asks for input when no client address is known", async () => {
    const { service } = make();
    await expect(service.lookup("", "")).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
    });
  });
});

describe("database problems", () => {
  it("reports an unavailable database and tries again next time", async () => {
    let attempts = 0;
    const service = createGeoIpService({
      loadReader: async () => {
        attempts += 1;
        if (attempts === 1) throw new Error("file not found");
        return reader({ "8.8.8.8": GOOGLE });
      },
      resolve: async () => [],
    });
    await expect(service.lookup("8.8.8.8", "")).rejects.toMatchObject({
      code: "GEOIP_UNAVAILABLE",
      statusCode: 503,
    });
    expect(await service.lookup("8.8.8.8", "")).toMatchObject({ found: true });
    expect(attempts).toBe(2);
  });
  it("loads the database only once", async () => {
    const { service, calls } = make();
    await service.lookup("8.8.8.8", "");
    await service.lookup("8.8.8.8", "");
    await Promise.all([
      service.lookup("8.8.8.8", ""),
      service.lookup("2606:4700::1111", ""),
    ]);
    expect(calls.load).toBe(1);
  });
  it("turns a failing read into a clear error", async () => {
    const service = createGeoIpService({
      loadReader: async () => ({
        get: () => {
          throw new Error("corrupt");
        },
      }),
      resolve: async () => [],
    });
    await expect(service.lookup("8.8.8.8", "")).rejects.toMatchObject({
      code: "GEOIP_FAILED",
      statusCode: 502,
    });
  });
  it("always carries the honest note", async () => {
    const { service } = make();
    const found = await service.lookup("8.8.8.8", "");
    const missing = await service.lookup("1.1.1.1", "");
    for (const result of [found, missing])
      expect(result.note).toContain("approximate");
  });
});
