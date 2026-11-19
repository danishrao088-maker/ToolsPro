import { randomBytes } from "node:crypto";
import { AppError } from "../utils/AppError";
import { hashPassword, verifyPassword } from "./adminPassword";
import { SESSION_SECONDS, signSession, verifySession } from "./adminSession";

// Database ka kaam ek chhote interface ke peeche hai, taake ye file bina database ke test ho sake.
export interface AdminRecord {
  id: string;
  email: string;
  passwordHash: string;
}

export interface AdminRepo {
  findByEmail(email: string): Promise<AdminRecord | null>;
  findById(id: string): Promise<AdminRecord | null>;
}

export interface AdminAuthDeps {
  repo: AdminRepo;
  secret: string;
  now?: () => Date;
}

export interface AdminIdentity {
  id: string;
  email: string;
}

const MAX_INPUT = 1024; // bohat lambay input par scrypt na chalaya jaye

export function createAdminAuthService(deps: AdminAuthDeps) {
  const now = deps.now ?? (() => new Date());
  let dummyHash: Promise<string> | undefined;

  const credentialsError = () => new AppError(401, "INVALID_CREDENTIALS", "The email or password is not correct.");

  async function login(email: unknown, password: unknown): Promise<{ token: string; admin: { email: string } }> {
    if (typeof email !== "string" || typeof password !== "string" || email.trim() === "" || password === "") {
      throw new AppError(400, "VALIDATION_ERROR", "Enter your email and password.");
    }
    if (email.length > MAX_INPUT || password.length > MAX_INPUT) throw credentialsError();

    const admin = await deps.repo.findByEmail(email.trim().toLowerCase());
    let ok: boolean;
    if (admin) {
      ok = await verifyPassword(password, admin.passwordHash);
    } else {
      // Email maujood na ho tab bhi utna hi waqt lagta hai, taake jawab ke waqt se email ka pata na chale
      dummyHash ??= hashPassword(randomBytes(16).toString("hex"));
      await verifyPassword(password, await dummyHash);
      ok = false;
    }
    if (!admin || !ok) throw credentialsError();

    const exp = Math.floor(now().getTime() / 1000) + SESSION_SECONDS;
    return { token: signSession({ sub: admin.id, exp }, deps.secret), admin: { email: admin.email } };
  }

  // Token theek aur admin abhi bhi maujood ho to uski pehchan, warna null
  async function authenticate(token: string | undefined): Promise<AdminIdentity | null> {
    if (!token) return null;
    const session = verifySession(token, deps.secret, now().getTime());
    if (!session) return null;
    const admin = await deps.repo.findById(session.sub);
    return admin ? { id: admin.id, email: admin.email } : null;
  }

  return { login, authenticate };
}

export type AdminAuthService = ReturnType<typeof createAdminAuthService>;