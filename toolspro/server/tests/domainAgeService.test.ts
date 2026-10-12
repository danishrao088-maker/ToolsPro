import { describe, expect, it } from "vitest";
import { AppError } from "../src/utils/AppError";
import { createSafeFetcher, FetchFailure, type SafeFetcher } from "../src/services/safeFetch";
import { createDomainAgeService } from "../src/services/domainAgeService";

const real = createSafeFetcher({});
const NOW = new Date("2026-10-12T00:00:00Z");
const BOOT = "https://data.iana.org/rdap/dns.json";
const bootJson = JSON.stringify({ services: [[["com"], ["https://rdap.verisign.com/com/v1/"]]] });
const comRecord = JSON.stringify({
  objectClassName: "domain",
  events: [{ eventAction: "registration", eventDate: "2020-01-15T00:00:00Z" }, { eventAction: "expiration", eventDate: "2027-01-15T00:00:00Z" }],
  entities: [{ roles: ["registrar"], vcardArray: ["vcard", [["fn", {}, "text", "Some Registrar"]]] }],
  nameservers: [{ ldhName: "ns1.example.net" }],
  status: ["active"],
});

type Reply = { status: number; body: string } | "fail";

function fake(replies: Record<string, Reply>) {
  const calls: string[] = [];
  const fetcher = {
    parse: real.parse,
    request: real.request,
    follow: async (url: string) => {
      calls.push(url);
      const reply = replies[url] ?? { status: 404, body: "{}" };
      if (reply === "fail") return { hops: [], final: null, stopped: "failed" as const, failure: new FetchFailure("TIMEOUT", "The server did not answer in time.", 5) };
      const final = { url, status: reply.status, statusText: "", headers: {}, body: reply.body, bodyBytes: reply.body.length, truncated: false, timeMs: 1, address: "1.1.1.1" };
      return { hops: [{ url, status: reply.status, statusText: "", location: null, timeMs: 1 }], final, stopped: "done" as const, failure: null };
    },
  } as unknown as SafeFetcher;
  return { fetcher, calls };
}

const REG = "https://rdap.verisign.com/com/v1/domain/";

describe("domainAgeService", () => {
  it("finds the age of a domain", async () => {
    const { fetcher } = fake({ [BOOT]: { status: 200, body: bootJson }, [`${REG}example.com`]: { status: 200, body: comRecord } });
    const out = await createDomainAgeService(fetcher, () => NOW).check("example.com");
        expect(out).toMatchObject({ found: true, domain: "example.com", registrar: "Some Registrar", nameservers: ["ns1.example.net"], registryHost: "rdap.verisign.com", checkedAt: "2026-10-12T00:00:00.000Z" });
    if (out.found) expect(out.age).toEqual({ years: 6, months: 8, days: 27, totalDays: 2462 });
  });

  it("falls back from a subdomain to the main domain", async () => {
    const { fetcher, calls } = fake({ [BOOT]: { status: 200, body: bootJson }, [`${REG}example.com`]: { status: 200, body: comRecord } });
    const out = await createDomainAgeService(fetcher, () => NOW).check("https://www.example.com/page?x=1");
    expect(out).toMatchObject({ found: true, domain: "example.com" });
    expect(calls).toEqual([BOOT, `${REG}www.example.com`, `${REG}example.com`]);
  });

  it("says so when no record exists", async () => {
    const { fetcher } = fake({ [BOOT]: { status: 200, body: bootJson } });
    const out = await createDomainAgeService(fetcher, () => NOW).check("nosuchdomain-abc.com");
    expect(out).toMatchObject({ found: false, reason: "NOT_FOUND" });
  });

  it("explains endings that have no RDAP", async () => {
    const { fetcher, calls } = fake({ [BOOT]: { status: 200, body: bootJson } });
    const out = await createDomainAgeService(fetcher, () => NOW).check("example.pk");
    expect(out).toMatchObject({ found: false, reason: "UNSUPPORTED_TLD" });
    if (!out.found) expect(out.message).toContain(".pk");
    expect(calls).toEqual([BOOT]);
  });

  it("caches the registry list for a day", async () => {
    const { fetcher, calls } = fake({ [BOOT]: { status: 200, body: bootJson }, [`${REG}example.com`]: { status: 200, body: comRecord } });
    let clock = NOW.getTime();
    const svc = createDomainAgeService(fetcher, () => new Date(clock));
    await svc.check("example.com");
    await svc.check("example.com");
    expect(calls.filter((c) => c === BOOT)).toHaveLength(1);
    clock += 25 * 60 * 60 * 1000;
    await svc.check("example.com");
    expect(calls.filter((c) => c === BOOT)).toHaveLength(2);
  });

  it("refuses IP addresses and bad input", async () => {
    const { fetcher } = fake({});
    const svc = createDomainAgeService(fetcher, () => NOW);
    await expect(svc.check("8.8.8.8")).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    await expect(svc.check("localhost")).rejects.toBeInstanceOf(AppError);
    await expect(svc.check("http://192.168.0.1")).rejects.toBeInstanceOf(AppError);
  });

  it("turns network and registry problems into clear errors", async () => {
    await expect(createDomainAgeService(fake({ [BOOT]: "fail" }).fetcher, () => NOW).check("example.com")).rejects.toMatchObject({ code: "RDAP_UNAVAILABLE", statusCode: 502 });
    await expect(createDomainAgeService(fake({ [BOOT]: { status: 200, body: "not json" } }).fetcher, () => NOW).check("example.com")).rejects.toMatchObject({ code: "RDAP_UNAVAILABLE" });
    const base = { [BOOT]: { status: 200, body: bootJson } } as Record<string, Reply>;
    await expect(createDomainAgeService(fake({ ...base, [`${REG}example.com`]: { status: 429, body: "{}" } }).fetcher, () => NOW).check("example.com")).rejects.toMatchObject({ code: "RDAP_BUSY", statusCode: 429 });
    await expect(createDomainAgeService(fake({ ...base, [`${REG}example.com`]: { status: 500, body: "{}" } }).fetcher, () => NOW).check("example.com")).rejects.toMatchObject({ code: "RDAP_UNAVAILABLE" });
    await expect(createDomainAgeService(fake({ ...base, [`${REG}example.com`]: { status: 200, body: "[]" } }).fetcher, () => NOW).check("example.com")).rejects.toMatchObject({ code: "RDAP_UNAVAILABLE" });
  });

  it("works with a record that has no registration date", async () => {
    const body = JSON.stringify({ objectClassName: "domain", events: [] });
    const { fetcher } = fake({ [BOOT]: { status: 200, body: bootJson }, [`${REG}example.com`]: { status: 200, body } });
    const out = await createDomainAgeService(fetcher, () => NOW).check("example.com");
    expect(out).toMatchObject({ found: true, registeredOn: null, age: null });
  });
});