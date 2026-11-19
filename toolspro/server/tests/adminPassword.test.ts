import { describe, expect, it } from "vitest";
import { hashPassword, passwordProblem, verifyPassword } from "../src/services/adminPassword";

describe("hashPassword and verifyPassword", () => {
  it("accepts the right password and refuses a wrong one", async () => {
    const stored = await hashPassword("correct horse battery");
    expect(stored.startsWith("scrypt$65536$8$1$")).toBe(true);
    expect(stored).not.toContain("correct horse");
    expect(await verifyPassword("correct horse battery", stored)).toBe(true);
    expect(await verifyPassword("correct horse batterY", stored)).toBe(false);
    expect(await verifyPassword("", stored)).toBe(false);
  });
  it("uses a new salt every time", async () => {
    expect(await hashPassword("same password here")).not.toBe(await hashPassword("same password here"));
  });
  it("treats look-alike unicode spellings as the same password", async () => {
    const stored = await hashPassword("caf\u00e9 password 1");
    expect(await verifyPassword("cafe\u0301 password 1", stored)).toBe(true);
  });
  it("refuses damaged or unsafe stored values without crashing", async () => {
    for (const bad of ["", "plain", "bcrypt$1$2$3$4$5", "scrypt$65536$8$1$onlyfive", "scrypt$abc$8$1$c2FsdA==$aGFzaA==", "scrypt$3$8$1$c2FsdA==$aGFzaA==", "scrypt$2097152$8$1$c2FsdA==$aGFzaA==", "scrypt$65536$8$1$$aGFzaA==", "scrypt$65536$8$1$c2FsdA==$"]) {
      expect(await verifyPassword("anything", bad)).toBe(false);
    }
  });
});

describe("passwordProblem", () => {
  it("accepts a good password", () => {
    expect(passwordProblem("a Good pass-phrase 2026")).toBeNull();
  });
  it("explains why a password is refused", () => {
    expect(passwordProblem("short1")).toContain("at least 12");
    expect(passwordProblem("x".repeat(129))).toContain("at most 128");
    expect(passwordProblem(" leading space password")).toContain("space");
    expect(passwordProblem("trailing space password ")).toContain("space");
    expect(passwordProblem("aaaaaaaaaaaaaaaa")).toContain("repetitive");
  });
});