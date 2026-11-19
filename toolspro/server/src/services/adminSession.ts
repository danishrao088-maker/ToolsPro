import { createHmac, timingSafeEqual } from "node:crypto";

export const SESSION_COOKIE = "toolspro_admin";
export const SESSION_SECONDS = 7 * 24 * 60 * 60;
const COOKIE_PATH = "/api/admin"; 
const MAX_TOKEN_LENGTH = 1024;

export interface SessionPayload {
  sub: string;
  exp: number; // seconds
}

const b64 = (data: Buffer | string): string => Buffer.from(data).toString("base64url");
const sign = (body: string, secret: string): Buffer => createHmac("sha256", secret).update(body).digest();

export function signSession(payload: SessionPayload, secret: string): string {
  const body = b64(JSON.stringify(payload));
  return `${body}.${b64(sign(body, secret))}`;
}

export function verifySession(token: string, secret: string, nowMs: number): SessionPayload | null {
  if (token.length === 0 || token.length > MAX_TOKEN_LENGTH) return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [body, signature] = parts as [string, string];
  const given = Buffer.from(signature, "base64url");
  const expected = sign(body, secret);
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  try {
    const data = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as Partial<SessionPayload> | null;
    if (!data || typeof data.sub !== "string" || data.sub === "" || typeof data.exp !== "number" || !Number.isFinite(data.exp)) return null;
    return data.exp * 1000 > nowMs ? { sub: data.sub, exp: data.exp } : null;
  } catch {
    return null;
  }
}

export function parseCookies(header: string | undefined): Record<string, string> {
  const cookies: Record<string, string> = {};
  if (!header) return cookies;
  for (const piece of header.split(";")) {
    const index = piece.indexOf("=");
    if (index < 1) continue;
    const name = piece.slice(0, index).trim();
    let value = piece.slice(index + 1).trim();
    try {
      value = decodeURIComponent(value);
    } catch {
      continue;
    }
    if (!(name in cookies)) cookies[name] = value;
  }
  return cookies;
}

export function readSessionCookie(header: string | undefined): string | undefined {
  return parseCookies(header)[SESSION_COOKIE];
}

export function buildSessionCookie(token: string, secure: boolean): string {
  return `${SESSION_COOKIE}=${token}; Max-Age=${SESSION_SECONDS}; Path=${COOKIE_PATH}; HttpOnly; SameSite=Strict${secure ? "; Secure" : ""}`;
}

export function buildClearCookie(secure: boolean): string {
  return `${SESSION_COOKIE}=; Max-Age=0; Path=${COOKIE_PATH}; HttpOnly; SameSite=Strict${secure ? "; Secure" : ""}`;
}