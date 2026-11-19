import { describe, expect, it } from "vitest";
import {
  SESSION_COOKIE,
  SESSION_SECONDS,
  buildClearCookie,
  buildSessionCookie,
  parseCookies,
  readSessionCookie,
  signSession,
  verifySession,
} from "../src/services/adminSession";

const SECRET = "a".repeat(40);
const NOW = Date.UTC(2026, 10, 18);
const exp = Math.floor(NOW / 1000) + 3600;

describe("signSession and verifySession", () => {
  it("round-trips a valid token", () => {
    const token = signSession({ sub: "abc123", exp }, SECRET);
    expect(verifySession(token, SECRET, NOW)).toEqual({ sub: "abc123", exp });
  });
  it("refuses an expired token", () => {
    const token = signSession({ sub: "abc123", exp: Math.floor(NOW / 1000) - 1 }, SECRET);
    expect(verifySession(token, SECRET, NOW)).toBeNull();
  });
  it("refuses a token signed with another secret", () => {
    const token = signSession({ sub: "abc123", exp }, "b".repeat(40));
    expect(verifySession(token, SECRET, NOW)).toBeNull();
  });
  it("refuses a token whose content was changed", () => {
    const token = signSession({ sub: "abc123", exp }, SECRET);
    const [, signature] = token.split(".") as [string, string];
    const forged = `${Buffer.from(JSON.stringify({ sub: "someone-else", exp })).toString("base64url")}.${signature}`;
    expect(verifySession(forged, SECRET, NOW)).toBeNull();
  });
  it("refuses malformed input", () => {
    const good = signSession({ sub: "abc123", exp }, SECRET);
    const noSub = signSession({ exp } as never, SECRET);
    const badExp = signSession({ sub: "x", exp: "soon" } as never, SECRET);
    const emptySub = signSession({ sub: "", exp }, SECRET);
    for (const token of ["", "nodot", "a.b.c", ".", `${good}x`, `${good}.extra`, "a".repeat(2000), noSub, badExp, emptySub]) {
      expect(verifySession(token, SECRET, NOW)).toBeNull();
    }
  });
});

describe("cookies", () => {
  it("parses a cookie header", () => {
    expect(parseCookies("a=1; b=two%20words; c=3")).toEqual({ a: "1", b: "two words", c: "3" });
    expect(parseCookies(undefined)).toEqual({});
    expect(parseCookies("")).toEqual({});
    expect(parseCookies("=x; novalue; ok=1; bad=%E0%A4%A")).toEqual({ ok: "1" });
  });
  it("keeps the first value when a name repeats", () => {
    expect(parseCookies("a=1; a=2")).toEqual({ a: "1" });
  });
  it("reads the session cookie", () => {
    expect(readSessionCookie(`x=1; ${SESSION_COOKIE}=tok.en; y=2`)).toBe("tok.en");
    expect(readSessionCookie("x=1")).toBeUndefined();
  });
  it("builds a locked-down cookie", () => {
    const cookie = buildSessionCookie("tok.en", false);
    expect(cookie).toContain(`${SESSION_COOKIE}=tok.en`);
    expect(cookie).toContain(`Max-Age=${SESSION_SECONDS}`);
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("SameSite=Strict");
    expect(cookie).toContain("Path=/api/admin");
    expect(cookie).not.toContain("Secure");
    expect(buildSessionCookie("tok.en", true)).toContain("; Secure");
  });
  it("builds a cookie that clears the session", () => {
    const cookie = buildClearCookie(true);
    expect(cookie.startsWith(`${SESSION_COOKIE}=;`)).toBe(true);
    expect(cookie).toContain("Max-Age=0");
    expect(cookie).toContain("; Secure");
    expect(cookie).toContain("HttpOnly");
  });
});