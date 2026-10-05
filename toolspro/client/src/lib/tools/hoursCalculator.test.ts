import { describe, expect, it } from "vitest";
import { calculateHours, parseTime, type HoursInput, type HoursResult } from "./hoursCalculator";

const base: HoursInput = { start: "09:00", end: "17:30", breakMinutes: "", endsNextDay: false };

function ok(result: HoursResult) {
  if (!result.ok) throw new Error(`Expected success but got: ${result.error}`);
  return result;
}

function failure(result: HoursResult): string {
  if (result.ok) throw new Error("Expected an error.");
  return result.error;
}

describe("parseTime", () => {
  it("parses valid times and rejects invalid ones", () => {
    expect(parseTime("00:00")).toBe(0);
    expect(parseTime("09:30")).toBe(570);
    expect(parseTime("23:59")).toBe(1439);
    expect(parseTime("09:00:30")).toBe(540);
    for (const value of ["", "9:00", "24:00", "12:60", "abc"]) {
      expect(parseTime(value), value).toBeNull();
    }
  });
});

describe("calculateHours", () => {
  it("calculates a normal shift", () => {
    expect(ok(calculateHours(base))).toMatchObject({ netMinutes: 510, decimalHours: "8.50", label: "8 hours 30 minutes" });
  });

  it("subtracts a break", () => {
    expect(ok(calculateHours({ ...base, breakMinutes: "30" }))).toMatchObject({ netMinutes: 480, decimalHours: "8.00" });
  });

  it("handles a shift that ends the next day", () => {
    const result = ok(calculateHours({ start: "22:00", end: "06:00", breakMinutes: "", endsNextDay: true }));
    expect(result.netMinutes).toBe(480);
  });

  it("asks about the next day when the end is before the start", () => {
    expect(failure(calculateHours({ ...base, start: "22:00", end: "06:00" }))).toContain("next day");
  });

  it("treats equal times as 0 hours, or 24 hours with the next day box", () => {
    expect(ok(calculateHours({ ...base, start: "08:00", end: "08:00" })).netMinutes).toBe(0);
    const full = ok(calculateHours({ ...base, start: "08:00", end: "08:00", endsNextDay: true }));
    expect(full).toMatchObject({ netMinutes: 1440, decimalHours: "24.00" });
  });

  it("rejects a shift longer than 24 hours", () => {
    expect(failure(calculateHours({ ...base, start: "08:00", end: "10:00", endsNextDay: true }))).toContain("24 hours");
  });

  it("rejects a break longer than the shift", () => {
    expect(failure(calculateHours({ ...base, breakMinutes: "600" }))).toContain("longer than the shift");
  });

  it("rejects an invalid break", () => {
    for (const value of ["abc", "-5", "1.5", "1441"]) {
      expect(failure(calculateHours({ ...base, breakMinutes: value })), value).toContain("break");
    }
  });

  it("rounds decimal hours to two places", () => {
    expect(ok(calculateHours({ ...base, start: "09:00", end: "09:20" }))).toMatchObject({
      decimalHours: "0.33",
      label: "0 hours 20 minutes",
    });
    expect(ok(calculateHours({ ...base, start: "09:00", end: "09:40" })).decimalHours).toBe("0.67");
  });

  it("asks for missing times", () => {
    expect(failure(calculateHours({ ...base, start: "" }))).toBe("Enter a start time.");
    expect(failure(calculateHours({ ...base, end: "" }))).toBe("Enter an end time.");
  });
});