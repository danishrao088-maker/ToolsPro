import { describe, expect, it } from "vitest";
import { formatAge, formatDate } from "./format";

describe("formatDate", () => {
  it("writes the date in words", () => {
    expect(formatDate("1995-08-14T04:00:00.000Z")).toBe("14 August 1995");
    expect(formatDate("2027-01-01T00:00:00Z")).toBe("1 January 2027");
  });
  it("shows a dash for an invalid date", () => {
    expect(formatDate("garbage")).toBe("—");
  });
});

describe("formatAge", () => {
  it("joins the parts that are not zero", () => {
    expect(formatAge({ years: 31, months: 1, days: 28 })).toBe("31 years, 1 month, 28 days");
    expect(formatAge({ years: 1, months: 0, days: 1 })).toBe("1 year, 1 day");
    expect(formatAge({ years: 0, months: 3, days: 0 })).toBe("3 months");
  });
  it("handles a brand new domain", () => {
    expect(formatAge({ years: 0, months: 0, days: 0 })).toBe("Less than a day");
  });
});