import { describe, expect, it } from "vitest";
import { buildDate, normalizeIp, parseIpInput, shapeRecord } from "../src/services/geoIp";

describe("normalizeIp", () => {
  it("accepts IPv4 and IPv6", () => {
    expect(normalizeIp("8.8.8.8")).toBe("8.8.8.8");
    expect(normalizeIp(" 8.8.8.8 ")).toBe("8.8.8.8");
    expect(normalizeIp("2001:DB8::1")).toBe("2001:db8::1");
    expect(normalizeIp("[2001:db8::1]")).toBe("2001:db8::1");
  });
  it("turns IPv4-in-IPv6 into IPv4 and drops a zone", () => {
    expect(normalizeIp("::ffff:8.8.4.4")).toBe("8.8.4.4");
    expect(normalizeIp("fe80::1%eth0")).toBe("fe80::1");
  });
  it("returns null for anything else", () => {
    for (const bad of ["", "example.com", "999.1.1.1", "1.2.3", "8.8.8.8:53", "1.2.3.4/24"]) expect(normalizeIp(bad)).toBeNull();
  });
});

describe("parseIpInput", () => {
  it("reads IPs and domains", () => {
    expect(parseIpInput("8.8.8.8")).toEqual({ kind: "ip", ip: "8.8.8.8" });
    expect(parseIpInput("Example.COM")).toEqual({ kind: "host", host: "example.com" });
    expect(parseIpInput("example.com.")).toEqual({ kind: "host", host: "example.com" });
  });
  it("takes the host out of a full address", () => {
    expect(parseIpInput("https://www.example.com:8080/a/b?x=1")).toEqual({ kind: "host", host: "www.example.com" });
    expect(parseIpInput("http://8.8.8.8/path")).toEqual({ kind: "ip", ip: "8.8.8.8" });
    expect(parseIpInput("http://[2001:db8::1]:80/")).toEqual({ kind: "ip", ip: "2001:db8::1" });
  });
  it("rejects empty, long, spaced and odd input with a clear message", () => {
    const messages = ["", "   ", "a".repeat(300), "exa mple.com", "localhost", "-bad-.com", "user:pass@example.com", "http://", "exa_mple.com"].map((value) => {
      try {
        parseIpInput(value);
        return "no error";
      } catch (error) {
        return (error as { code?: string }).code ?? "other";
      }
    });
    expect(messages).toEqual(Array(messages.length).fill("VALIDATION_ERROR"));
  });
});

describe("shapeRecord", () => {
  const record = {
    continent: { code: "NA", names: { en: "North America", de: "Nordamerika" } },
    country: { iso_code: "US", names: { en: "United States" } },
    subdivisions: [{ names: { en: "California" } }],
    city: { names: { en: "Mountain View" } },
    location: { latitude: 37.4, longitude: -122.08 },
  };
  it("reads the English names, codes and position", () => {
    expect(shapeRecord(record)).toEqual({
      continent: "North America", continentCode: "NA", country: "United States", countryCode: "US",
      region: "California", city: "Mountain View", latitude: 37.4, longitude: -122.08,
    });
  });
  it("copes with missing parts", () => {
    expect(shapeRecord({ country: { iso_code: "PK", names: { en: "Pakistan" } } })).toMatchObject({ country: "Pakistan", city: null, region: null, latitude: null, longitude: null });
  });
  it("drops a position that is only half there or out of range", () => {
    expect(shapeRecord({ ...record, location: { latitude: 37.4 } })).toMatchObject({ latitude: null, longitude: null });
    expect(shapeRecord({ ...record, location: { latitude: 120, longitude: 10 } })).toMatchObject({ latitude: null, longitude: null });
    expect(shapeRecord({ ...record, location: { latitude: "1", longitude: "2" } })).toMatchObject({ latitude: null });
  });
  it("returns null when there is nothing useful", () => {
    for (const value of [null, undefined, "x", 5, {}, { location: { latitude: 1 } }, { country: { names: {} } }]) expect(shapeRecord(value)).toBeNull();
  });
});

describe("buildDate", () => {
  it("accepts a Date, seconds or milliseconds", () => {
    expect(buildDate(new Date("2026-10-01T00:00:00Z"))).toBe("2026-10-01T00:00:00.000Z");
    expect(buildDate(1790812800)).toBe("2026-10-01T00:00:00.000Z");
    expect(buildDate(1790812800000)).toBe("2026-10-01T00:00:00.000Z");
  });
  it("returns null for nothing or rubbish", () => {
    expect(buildDate(undefined)).toBeNull();
    expect(buildDate(new Date("nope"))).toBeNull();
    expect(buildDate(Number.NaN)).toBeNull();
  });
});