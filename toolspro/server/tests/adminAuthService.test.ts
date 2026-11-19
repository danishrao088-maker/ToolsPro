import { beforeAll, describe, expect, it } from "vitest";
import { hashPassword } from "../src/services/adminPassword";
import { createAdminAuthService, type AdminRecord, type AdminRepo } from "../src/services/adminAuthService";
import { SESSION_SECONDS, verifySession } from "../src/services/adminSession";

const SECRET = "s".repeat(40);
const NOW = new Date("2026-11-18T00:00:00.000Z");
let admin: AdminRecord;

beforeAll(async () => {
  admin = { id: "65a000000000000000000001", email: "owner@example.com", passwordHash: await hashPassword("a Good pass-phrase 2026") };
});

function setup(records: AdminRecord[] = [admin]) {
  const calls = { byEmail: [] as string[], byId: [] as string[] };
  const repo: AdminRepo = {
    async findByEmail(email) {
      calls.byEmail.push(email);
      return records.find((r) => r.email === email) ?? null;
    },
    async findById(id) {
      calls.byId.push(id);
      return records.find((r) => r.id === id) ?? null;
    },
  };
  return { service: createAdminAuthService({ repo, secret: SECRET, now: () => NOW }), calls, records };
}

const codeOf = (promise: Promise<unknown>) => promise.then(() => "no error", (error: { code?: string }) => error.code ?? "other");

describe("login", () => {
  it("returns a signed token for the right email and password", async () => {
    const { service } = setup();
    const result = await service.login("owner@example.com", "a Good pass-phrase 2026");
    expect(result.admin).toEqual({ email: "owner@example.com" });
    expect(verifySession(result.token, SECRET, NOW.getTime())).toEqual({
      sub: admin.id,
      exp: Math.floor(NOW.getTime() / 1000) + SESSION_SECONDS,
    });
  });
  it("ignores capital letters and spaces around the email", async () => {
    const { service, calls } = setup();
    await service.login("  Owner@Example.COM ", "a Good pass-phrase 2026");
    expect(calls.byEmail).toEqual(["owner@example.com"]);
  });
  it("gives the same answer for a wrong password and an unknown email", async () => {
    const { service } = setup();
    for (const attempt of [service.login("owner@example.com", "wrong password here"), service.login("nobody@example.com", "a Good pass-phrase 2026")]) {
      await expect(attempt).rejects.toMatchObject({ statusCode: 401, code: "INVALID_CREDENTIALS", message: "The email or password is not correct." });
    }
  });
  it("asks for both fields", async () => {
    const { service, calls } = setup();
    for (const [email, password] of [[undefined, "x"], ["a@b.co", undefined], ["", "x"], ["   ", "x"], ["a@b.co", ""], [5, "x"], ["a@b.co", { $ne: "" }], [["a@b.co"], "x"]] as const) {
      expect(await codeOf(service.login(email, password))).toBe("VALIDATION_ERROR");
    }
    expect(calls.byEmail).toHaveLength(0);
  });
  it("refuses very long input without asking the database", async () => {
    const { service, calls } = setup();
    expect(await codeOf(service.login("a".repeat(2000) + "@example.com", "x"))).toBe("INVALID_CREDENTIALS");
    expect(await codeOf(service.login("owner@example.com", "p".repeat(5000)))).toBe("INVALID_CREDENTIALS");
    expect(calls.byEmail).toHaveLength(0);
  });
  it("passes database errors on", async () => {
    const repo: AdminRepo = {
      findByEmail: async () => {
        throw Object.assign(new Error("down"), { statusCode: 503, code: "DB_UNAVAILABLE" });
      },
      findById: async () => null,
    };
    const service = createAdminAuthService({ repo, secret: SECRET });
    expect(await codeOf(service.login("owner@example.com", "whatever password"))).toBe("DB_UNAVAILABLE");
  });
});

describe("authenticate", () => {
  it("returns the admin for a valid token", async () => {
    const { service } = setup();
    const { token } = await service.login("owner@example.com", "a Good pass-phrase 2026");
    expect(await service.authenticate(token)).toEqual({ id: admin.id, email: admin.email });
  });
  it("returns null when there is no token or it is bad", async () => {
    const { service, calls } = setup();
    for (const token of [undefined, "", "garbage", "a.b"]) expect(await service.authenticate(token)).toBeNull();
    expect(calls.byId).toHaveLength(0);
  });
  it("returns null once the admin account is gone", async () => {
    const { service, records } = setup();
    const { token } = await service.login("owner@example.com", "a Good pass-phrase 2026");
    records.length = 0;
    expect(await service.authenticate(token)).toBeNull();
  });
  it("returns null for an expired token", async () => {
    const { service } = setup();
    const { token } = await service.login("owner@example.com", "a Good pass-phrase 2026");
    const later = createAdminAuthService({
      repo: { findByEmail: async () => admin, findById: async () => admin },
      secret: SECRET,
      now: () => new Date(NOW.getTime() + (SESSION_SECONDS + 1) * 1000),
    });
    expect(await later.authenticate(token)).toBeNull();
  });
  it("returns null for a token signed with a different secret", async () => {
    const { service } = setup();
    const { token } = await service.login("owner@example.com", "a Good pass-phrase 2026");
    const other = createAdminAuthService({ repo: { findByEmail: async () => admin, findById: async () => admin }, secret: "z".repeat(40), now: () => NOW });
    expect(await other.authenticate(token)).toBeNull();
  });
});