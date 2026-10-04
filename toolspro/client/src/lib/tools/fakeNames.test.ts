import { describe, expect, it } from "vitest";
import { NAME_LISTS, generateFakeNames, type FakeNameInput } from "./fakeNames";
import { error, message, output } from "./testHelpers";

// Chhota seeded random: ek hi seed hamesha ek jaisi sequence deta hai
function seeded(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const base: FakeNameInput = { region: "english", count: "10" };

describe("generateFakeNames", () => {
  it("creates the requested number of different names", () => {
    const lines = output(generateFakeNames({ ...base, count: "50" })).split("\n");
    expect(lines).toHaveLength(50);
    expect(new Set(lines).size).toBe(50);
    for (const line of lines) expect(line.split(" ")).toHaveLength(2);
  });

  it("gives the same result for the same seed", () => {
    const a = output(generateFakeNames(base, seeded(42)));
    const b = output(generateFakeNames(base, seeded(42)));
    const c = output(generateFakeNames(base, seeded(43)));
    expect(a).toBe(b);
    expect(a).not.toBe(c);
  });

  it("uses names from the chosen style", () => {
    for (const region of ["english", "south-asian"] as const) {
      const lines = output(generateFakeNames({ region, count: "20" }, seeded(7))).split("\n");
      for (const line of lines) {
        const [first, last] = line.split(" ");
        expect(NAME_LISTS[region].first, line).toContain(first);
        expect(NAME_LISTS[region].last, line).toContain(last);
      }
    }
  });

  it("rejects an invalid count or style", () => {
    expect(error(generateFakeNames({ ...base, count: "7" }))).toContain("how many");
    expect(error(generateFakeNames({ region: "mars" as never, count: "5" }))).toContain("name style");
  });

  it("stops instead of looping forever when random never changes", () => {
    const result = generateFakeNames({ ...base, count: "5" }, () => 0);
    expect(output(result).split("\n")).toHaveLength(1);
    expect(message(result)).toContain("Only 1 different name");
  });

  it("reminds the user these names are for testing", () => {
    expect(message(generateFakeNames(base))).toContain("testing");
  });

  it("has enough unique names in every list", () => {
    for (const lists of Object.values(NAME_LISTS)) {
      expect(new Set(lists.first).size).toBe(lists.first.length);
      expect(new Set(lists.last).size).toBe(lists.last.length);
      expect(lists.first.length).toBeGreaterThanOrEqual(25);
      expect(lists.last.length).toBeGreaterThanOrEqual(25);
    }
  });
});