import { AppError } from "../utils/AppError";
import { LINK_LIFETIME_DAYS, generateCode, isValidCode, parseDestination } from "./shortUrl";

// Database ka kaam ek chhote interface ke peeche hai, taake ye file bina database ke test ho sake.
export interface ShortUrlRepo {
  insert(doc: { code: string; destination: string; expiresAt: Date }): Promise<"ok" | "duplicate">;
  // Chalne wale (expire na hue) link ka address lautata hai aur click ginti 1 barhata hai
  hit(code: string, now: Date): Promise<{ destination: string } | null>;
}

export interface ShortUrlDeps {
  repo: ShortUrlRepo;
  now?: () => Date;
  makeCode?: () => string;
  maxAttempts?: number;
}

export interface CreatedShortUrl {
  code: string;
  path: string;
  destination: string;
  expiresAt: string;
}

export function createShortUrlService(deps: ShortUrlDeps) {
  const now = deps.now ?? (() => new Date());
  const makeCode = deps.makeCode ?? (() => generateCode());
  const maxAttempts = deps.maxAttempts ?? 5;

  async function create(input: string, ownHosts: string[] = []): Promise<CreatedShortUrl> {
    const destination = parseDestination(input, ownHosts);
    const expiresAt = new Date(now().getTime() + LINK_LIFETIME_DAYS * 24 * 60 * 60 * 1000);
    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      const code = makeCode();
      if ((await deps.repo.insert({ code, destination, expiresAt })) === "ok") {
        return { code, path: `/s/${code}`, destination, expiresAt: expiresAt.toISOString() };
      }
    }
    throw new AppError(503, "CODE_UNAVAILABLE", "A short link could not be created right now. Please try again.");
  }

  // Link na mile, expire ho chuka ho ya code ki shakal ghalat ho to null
  async function resolve(code: unknown): Promise<string | null> {
    if (!isValidCode(code)) return null;
    const found = await deps.repo.hit(code, now());
    return found ? found.destination : null;
  }

  return { create, resolve };
}