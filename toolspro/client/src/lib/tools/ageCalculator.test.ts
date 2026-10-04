import { describe, expect, it } from "vitest";
import { calculateAge, toISODate, type AgeResult } from "./ageCalculator";

function ok(birth: string, asOf: string) {
  const result: AgeResult = calculateAge(birth, asOf);
  if (!result.ok) throw new Error(`Expected success but got: ${result.error}`);
  return result;
}

function fails(birth: string, asOf: string): string {
  const result = calculateAge(birth, asOf);
  if (result.ok) throw new Error("Expected an error but the calculation succeeded.");
  return result.error;
}

describe("calculateAge", () => {
  it("counts an exact birthday", () => {
    const r = ok("2000-01-15", "2024-01-15");
    expect([r.years, r.months, r.days]).toEqual([24, 0, 0]);
  });

  it("returns years, months and days", () => {
    const r = ok("1990-05-20", "2024-03-10");
    expect([r.years, r.months, r.days]).toEqual([33, 9, 19]);
  });

  it("handles a leap-day birth", () => {
    const r = ok("2000-02-29", "2023-03-01");
    expect([r.years, r.months, r.days]).toEqual([23, 0, 1]);
  });

  it("does not overflow at the end of a month", () => {
    const r = ok("2023-01-31", "2023-03-01");
    expect([r.years, r.months, r.days]).toEqual([0, 1, 1]);
  });

  it("returns zero for the same day", () => {
    const r = ok("2024-06-01", "2024-06-01");
    expect([r.years, r.months, r.days, r.totalDays]).toEqual([0, 0, 0, 0]);
  });

  it("counts total days", () => {
    expect(ok("2000-01-01", "2000-01-31").totalDays).toBe(30);
  });

  it("counts total months", () => {
    expect(ok("1990-05-20", "2024-03-10").totalMonths).toBe(405);
  });

  it("asks for a date of birth", () => {
    expect(fails("", "2024-01-01")).toContain("date of birth");
  });

  it("asks for the comparison date", () => {
    expect(fails("2000-01-01", "")).toContain("calculate the age at");
  });

  it("rejects dates that do not exist", () => {
    expect(fails("2023-02-30", "2024-01-01")).toContain("valid date of birth");
  });

  it("rejects years before 1900", () => {
    expect(fails("1850-01-01", "2024-01-01")).toContain("1900");
  });

  it("rejects a birth date after the comparison date", () => {
    expect(fails("2025-01-01", "2024-01-01")).toContain("cannot be after");
  });

  it("counts days until the next birthday", () => {
    expect(ok("1990-05-20", "2024-05-19").daysUntilBirthday).toBe(1);
    expect(ok("1990-05-20", "2024-05-20").daysUntilBirthday).toBe(0);
    expect(ok("1990-05-20", "2024-05-21").daysUntilBirthday).toBe(364);
  });

  it("counts a leap-day birthday in non-leap years", () => {
    expect(ok("2000-02-29", "2023-03-01").daysUntilBirthday).toBe(365);
  });
});

describe("toISODate", () => {
  it("formats a local date with zero padding", () => {
    expect(toISODate(new Date(2024, 0, 5))).toBe("2024-01-05");
  });
});