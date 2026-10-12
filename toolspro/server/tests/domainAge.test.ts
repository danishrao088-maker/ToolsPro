import { describe, expect, it } from "vitest";
import { ageBetween, domainCandidates, findRdapBase, parseRdap } from "../src/services/domainAge";

const d = (s: string) => new Date(s);

describe("ageBetween", () => {
  it("counts whole years, months and days", () => {
    expect(ageBetween(d("1995-08-14T00:00:00Z"), d("2026-10-12T00:00:00Z"))).toEqual({ years: 31, months: 1, days: 28, totalDays: 11382 });
  });
  it("borrows days from the previous month", () => {
    expect(ageBetween(d("2020-01-31T00:00:00Z"), d("2020-03-01T00:00:00Z"))).toMatchObject({ years: 0, months: 1, days: 1 });
  });
  it("borrows months from the year", () => {
    expect(ageBetween(d("2020-11-15T00:00:00Z"), d("2021-02-10T00:00:00Z"))).toMatchObject({ years: 0, months: 2, days: 26 });
  });
  it("handles january borrowing the previous december", () => {
    expect(ageBetween(d("2019-12-20T00:00:00Z"), d("2020-01-05T00:00:00Z"))).toMatchObject({ years: 0, months: 0, days: 16 });
  });
  it("gives zero for the same day", () => {
    expect(ageBetween(d("2024-05-05T00:00:00Z"), d("2024-05-05T00:00:00Z"))).toEqual({ years: 0, months: 0, days: 0, totalDays: 0 });
  });
  it("returns null for a future start or invalid date", () => {
    expect(ageBetween(d("2030-01-01T00:00:00Z"), d("2026-01-01T00:00:00Z"))).toBeNull();
    expect(ageBetween(new Date("nope"), d("2026-01-01T00:00:00Z"))).toBeNull();
  });
});

describe("domainCandidates", () => {
  it("lists the name and its parents, never a lone ending", () => {
    expect(domainCandidates("www.example.com")).toEqual(["www.example.com", "example.com"]);
    expect(domainCandidates("example.com")).toEqual(["example.com"]);
    expect(domainCandidates("a.b.example.co.uk")).toEqual(["a.b.example.co.uk", "b.example.co.uk", "example.co.uk"]);
  });
  it("stops at the limit", () => {
    expect(domainCandidates("a.b.c.d.e.com", 2)).toHaveLength(2);
  });
});

const sample = {
  objectClassName: "domain",
  events: [
    { eventAction: "registration", eventDate: "1995-08-14T04:00:00Z" },
    { eventAction: "expiration", eventDate: "2027-08-13T04:00:00Z" },
    { eventAction: "last changed", eventDate: "2026-08-14T07:01:38Z" },
    { eventAction: "last update of RDAP database", eventDate: "2026-10-06T00:00:00Z" },
  ],
  status: ["client delete prohibited", 5, "client transfer prohibited"],
  nameservers: [{ ldhName: "ELLIOTT.NS.CLOUDFLARE.COM" }, { ldhName: "hera.ns.cloudflare.com" }, { nothing: true }],
  entities: [
    { roles: ["abuse"], vcardArray: ["vcard", [["fn", {}, "text", ""]]] },
    { roles: ["registrar"], vcardArray: ["vcard", [["version", {}, "text", "4.0"], ["fn", {}, "text", " Example Registrar, Inc. "]]] },
    { roles: ["registrant"], vcardArray: ["vcard", [["fn", {}, "text", "Private Person"]]] },
  ],
};

describe("parseRdap", () => {
  it("reads dates, registrar, name servers and status", () => {
    expect(parseRdap(sample)).toEqual({
      registeredOn: "1995-08-14T04:00:00.000Z",
      expiresOn: "2027-08-13T04:00:00.000Z",
      updatedOn: "2026-08-14T07:01:38.000Z",
      registrar: "Example Registrar, Inc.",
      nameservers: ["elliott.ns.cloudflare.com", "hera.ns.cloudflare.com"],
      statuses: ["client delete prohibited", "client transfer prohibited"],
    });
  });
  it("never returns a registrant name", () => {
    expect(JSON.stringify(parseRdap(sample))).not.toContain("Private Person");
  });
  it("copes with missing parts and bad dates", () => {
    expect(parseRdap({ objectClassName: "domain", events: [{ eventAction: "registration", eventDate: "garbage" }] })).toEqual({
      registeredOn: null, expiresOn: null, updatedOn: null, registrar: null, nameservers: [], statuses: [],
    });
  });
  it("rejects things that are not a domain answer", () => {
    expect(parseRdap(null)).toBeNull();
    expect(parseRdap([])).toBeNull();
    expect(parseRdap({ objectClassName: "nameserver" })).toBeNull();
  });
});

describe("findRdapBase", () => {
  const boot = { services: [[["com", "net"], ["http://old.example/", "https://rdap.verisign.com/com/v1/"]], [["org"], ["https://rdap.pir.org"]]] };
  it("finds the https address and adds a trailing slash", () => {
    expect(findRdapBase(boot, "com")).toBe("https://rdap.verisign.com/com/v1/");
    expect(findRdapBase(boot, "org")).toBe("https://rdap.pir.org/");
  });
  it("returns null when the ending is unknown or the list is broken", () => {
    expect(findRdapBase(boot, "pk")).toBeNull();
    expect(findRdapBase({}, "com")).toBeNull();
    expect(findRdapBase(null, "com")).toBeNull();
  });
});