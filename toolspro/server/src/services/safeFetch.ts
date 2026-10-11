import dns from "node:dns";
import http from "node:http";
import https from "node:https";
import { isIP, type LookupFunction } from "node:net";
import { AppError } from "../utils/AppError";
import { isBlockedAddress } from "../utils/ipGuard";
import { DEFAULT_PORTS, parseTargetUrl, type AllowedPorts } from "../utils/targetUrl";

// Ye file kisi bhi website ko server se kholne ka SAFE tareeqa hai. SSRF se bachne ke liye:
// 1. Address pehle parseTargetUrl se check hota hai (sirf http/https, aam ports, local naam block).
// 2. Domain ka DNS jawab dekha jata hai. Agar koi bhi IP private/khaas ho to request nahi jaati.
// 3. Connection usi check ki hui IP se banta hai (pin), is liye DNS dobara badal kar chakma nahi diya ja sakta.
// 4. Har redirect naye sire se check hota hai.
// 5. Waqt, jawab ka size aur ek saath chalne wali requests ki hadd mukarrar hai.

export type FailReason = "DNS_FAILED" | "CONNECTION_REFUSED" | "CONNECTION_RESET" | "TIMEOUT" | "TLS_ERROR" | "UNREACHABLE" | "REQUEST_FAILED";

export class FetchFailure extends Error {
  constructor(
    public reason: FailReason,
    message: string,
    public timeMs: number
  ) {
    super(message);
  }
}

class TimeoutSignal extends Error {}

export interface ResolvedAddress {
  address: string;
  family: number;
}
export type Resolver = (hostname: string) => Promise<ResolvedAddress[]>;

export interface FetcherConfig {
  resolve?: Resolver;
  isBlocked?: (address: string) => boolean;
  ports?: AllowedPorts;
  maxConcurrent?: number;
  userAgent?: string;
}

export interface FetchOptions {
  method?: "GET" | "HEAD";
  timeoutMs?: number;
  maxBytes?: number;
  readBody?: boolean | ((status: number) => boolean);
  headers?: Record<string, string>;
}

export interface FetchResponse {
  url: string;
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: string;
  bodyBytes: number;
  truncated: boolean;
  timeMs: number;
  address: string;
}

export interface RedirectHop {
  url: string;
  status: number;
  statusText: string;
  location: string | null;
  timeMs: number;
}

export type StopReason = "done" | "too_many" | "loop" | "blocked" | "bad_location" | "failed";

export interface RedirectResult {
  hops: RedirectHop[];
  final: FetchResponse | null;
  stopped: StopReason;
  failure: FetchFailure | null;
}

export interface FollowOptions {
  maxRedirects?: number;
  timeoutMs?: number; // poori chain ke liye kul waqt
  hopTimeoutMs?: number;
  maxBytes?: number;
  readFinalBody?: boolean;
  headers?: Record<string, string>;
}

const DEFAULT_TIMEOUT_MS = 8000;
const DEFAULT_MAX_BYTES = 1_000_000;
const REDIRECT_STATUSES = [301, 302, 303, 307, 308];

export const isRedirectStatus = (status: number) => REDIRECT_STATUSES.includes(status);

const defaultResolve: Resolver = async (hostname) => {
  const found = await dns.promises.lookup(hostname, { all: true, verbatim: true });
  return found.map((item) => ({ address: item.address, family: item.family }));
};

function flattenHeaders(raw: http.IncomingHttpHeaders): Record<string, string> {
  const out: Record<string, string> = {};
  let count = 0;
  for (const [key, value] of Object.entries(raw)) {
    if (value === undefined || count >= 60) continue;
    count += 1;
    // Cookie ki qadar apne server se kisi ko nahi dikhate
    out[key] = key === "set-cookie" ? "[hidden]" : (Array.isArray(value) ? value.join(", ") : value).slice(0, 500);
  }
  return out;
}

const TLS_CODES = new Set([
  "CERT_HAS_EXPIRED", "CERT_NOT_YET_VALID", "DEPTH_ZERO_SELF_SIGNED_CERT", "SELF_SIGNED_CERT_IN_CHAIN",
  "UNABLE_TO_VERIFY_LEAF_SIGNATURE", "UNABLE_TO_GET_ISSUER_CERT", "UNABLE_TO_GET_ISSUER_CERT_LOCALLY",
  "ERR_TLS_CERT_ALTNAME_INVALID", "CERT_UNTRUSTED", "ERR_SSL_WRONG_VERSION_NUMBER", "EPROTO",
]);

function toFailure(error: unknown, started: number): FetchFailure {
  const timeMs = Date.now() - started;
  if (error instanceof FetchFailure) return error;
  if (error instanceof TimeoutSignal) return new FetchFailure("TIMEOUT", "The server did not answer in time.", timeMs);
  const code = (error as NodeJS.ErrnoException | undefined)?.code ?? "";
  if (code === "ENOTFOUND" || code === "EAI_AGAIN" || code === "EAI_NONAME" || code === "EAI_FAIL") return new FetchFailure("DNS_FAILED", "The domain name could not be found.", timeMs);
  if (code === "ECONNREFUSED") return new FetchFailure("CONNECTION_REFUSED", "The server refused the connection.", timeMs);
  if (code === "ECONNRESET" || code === "EPIPE") return new FetchFailure("CONNECTION_RESET", "The connection was closed by the server.", timeMs);
  if (code === "ETIMEDOUT") return new FetchFailure("TIMEOUT", "The server did not answer in time.", timeMs);
  if (code === "EHOSTUNREACH" || code === "ENETUNREACH") return new FetchFailure("UNREACHABLE", "The server could not be reached.", timeMs);
  if (TLS_CODES.has(code) || /certificate|ssl|tls/i.test(String((error as Error | undefined)?.message ?? ""))) {
    return new FetchFailure("TLS_ERROR", "The secure (HTTPS) connection could not be trusted.", timeMs);
  }
  return new FetchFailure("REQUEST_FAILED", "The request could not be completed.", timeMs);
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new TimeoutSignal()), Math.max(ms, 1));
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error);
      }
    );
  });
}

export function createSafeFetcher(config: FetcherConfig = {}) {
  const resolveHost = config.resolve ?? defaultResolve;
  const isBlocked = config.isBlocked ?? isBlockedAddress;
  const ports = config.ports ?? DEFAULT_PORTS;
  const maxConcurrent = config.maxConcurrent ?? 25;
  const userAgent = config.userAgent ?? "ToolsProChecker/1.0";
  let active = 0;

  async function connect(
    url: URL,
    address: ResolvedAddress,
    method: "GET" | "HEAD",
    headers: Record<string, string>,
    remainingMs: number,
    maxBytes: number,
    readBody: boolean | ((status: number) => boolean),
    started: number
  ): Promise<FetchResponse> {
    return new Promise<FetchResponse>((resolve, reject) => {
      const secure = url.protocol === "https:";
      const hostname = url.hostname.replace(/^\[|\]$/g, "");
      let settled = false;
      let finishBody: (() => void) | null = null;

      const done = (value: FetchResponse) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve(value);
      };
      const fail = (error: unknown) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        reject(toFailure(error, started));
      };

      // Connection hamesha wahi IP istemal karta hai jo humne check ki thi
      const lookup: LookupFunction = (_host, options, callback) => {
        if (options.all) callback(null, [{ address: address.address, family: address.family }]);
        else callback(null, address.address, address.family);
      };

      const req = (secure ? https : http).request(
        {
          protocol: url.protocol,
          hostname,
          port: url.port === "" ? undefined : Number(url.port),
          path: `${url.pathname}${url.search}`,
          method,
          headers,
          agent: false,
          lookup,
          ...(secure && isIP(hostname) === 0 ? { servername: hostname } : {}),
        },
        (res) => {
          const status = res.statusCode ?? 0;
          const base = {
            url: url.href,
            status,
            statusText: res.statusMessage ?? "",
            headers: flattenHeaders(res.headers),
            address: address.address,
          };
          const wantBody = method !== "HEAD" && (typeof readBody === "function" ? readBody(status) : readBody);
          if (!wantBody) {
            done({ ...base, body: "", bodyBytes: 0, truncated: false, timeMs: Date.now() - started });
            res.destroy();
            return;
          }
          const chunks: Buffer[] = [];
          let bytes = 0;
          let cut = false;
          finishBody = () => {
            const complete = res.complete && !cut;
            done({ ...base, body: Buffer.concat(chunks).toString("utf8"), bodyBytes: bytes, truncated: !complete, timeMs: Date.now() - started });
          };
          res.on("data", (chunk: Buffer) => {
            if (cut) return;
            const room = maxBytes - bytes;
            if (chunk.length > room) {
              chunks.push(chunk.subarray(0, room));
              bytes += room;
              cut = true;
              finishBody?.();
              res.destroy();
              return;
            }
            chunks.push(chunk);
            bytes += chunk.length;
          });
          res.on("end", () => finishBody?.());
          res.on("close", () => finishBody?.());
          res.on("error", () => finishBody?.());
        }
      );

      const timer = setTimeout(() => {
        if (finishBody) {
          // Header aa chuke hain, sirf body adhoori reh gayi: jo mila wahi wapis dete hain
          finishBody();
          req.destroy();
        } else {
          req.destroy(new TimeoutSignal());
        }
      }, Math.max(remainingMs, 1));

      req.on("error", fail);
      req.end();
    });
  }

  async function request(rawUrl: string, options: FetchOptions = {}): Promise<FetchResponse> {
    const url = parseTargetUrl(rawUrl, ports);
    if (active >= maxConcurrent) throw new AppError(503, "BUSY", "The checker is busy right now. Please try again in a moment.");
    active += 1;
    const started = Date.now();
    const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    try {
      const host = url.hostname.replace(/^\[|\]$/g, "");
      let addresses: ResolvedAddress[];
      if (isIP(host) !== 0) {
        addresses = [{ address: host, family: isIP(host) }];
      } else {
        try {
          addresses = await withTimeout(resolveHost(host), timeoutMs);
        } catch (error) {
          if (error instanceof TimeoutSignal) throw toFailure(error, started);
          throw new FetchFailure("DNS_FAILED", "The domain name could not be found.", Date.now() - started);
        }
      }
      if (addresses.length === 0) throw new FetchFailure("DNS_FAILED", "The domain name could not be found.", Date.now() - started);
      // Agar jawab mein ek bhi private IP ho to poori request band
      if (addresses.some((item) => isBlocked(item.address))) {
        throw new AppError(400, "URL_NOT_ALLOWED", "This web address cannot be checked.");
      }
      const chosen = addresses.find((item) => item.family === 4) ?? addresses[0]!;
      const headers: Record<string, string> = {
        "user-agent": userAgent,
        accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
        "accept-encoding": "identity",
        connection: "close",
        ...options.headers,
      };
      const remaining = timeoutMs - (Date.now() - started);
      return await connect(url, chosen, options.method ?? "GET", headers, remaining, options.maxBytes ?? DEFAULT_MAX_BYTES, options.readBody ?? false, started);
    } finally {
      active -= 1;
    }
  }

  async function follow(rawUrl: string, options: FollowOptions = {}): Promise<RedirectResult> {
    const maxRedirects = options.maxRedirects ?? 10;
    const totalMs = options.timeoutMs ?? 15000;
    const hopMs = options.hopTimeoutMs ?? DEFAULT_TIMEOUT_MS;
    const deadline = Date.now() + totalMs;
    const hops: RedirectHop[] = [];
    const visited = new Set<string>();
    let current = rawUrl;
    let final: FetchResponse | null = null;
    let stopped: StopReason = "done";
    let failure: FetchFailure | null = null;

    for (let index = 0; ; index += 1) {
      const remaining = deadline - Date.now();
      if (remaining <= 0) {
        stopped = "failed";
        failure = new FetchFailure("TIMEOUT", "The checks took too long.", totalMs);
        break;
      }
      let response: FetchResponse;
      try {
        response = await request(current, {
          timeoutMs: Math.min(hopMs, remaining),
          maxBytes: options.maxBytes,
          readBody: (status) => (options.readFinalBody ?? false) && !isRedirectStatus(status),
          headers: options.headers,
        });
      } catch (error) {
        if (error instanceof FetchFailure) {
          stopped = "failed";
          failure = error;
          break;
        }
        if (error instanceof AppError && index > 0 && (error.code === "URL_NOT_ALLOWED" || error.code === "INVALID_URL")) {
          stopped = "blocked";
          break;
        }
        throw error;
      }
      visited.add(response.url);
      const location = response.headers["location"] ?? null;
      hops.push({ url: response.url, status: response.status, statusText: response.statusText, location, timeMs: response.timeMs });

      if (!isRedirectStatus(response.status)) {
        final = response;
        break;
      }
      if (location === null) {
        final = response;
        stopped = "bad_location";
        break;
      }
      let next: string;
      try {
        const target = new URL(location, response.url);
        target.hash = "";
        next = target.href;
      } catch {
        final = response;
        stopped = "bad_location";
        break;
      }
      if (visited.has(next)) {
        stopped = "loop";
        break;
      }
      if (hops.length > maxRedirects) {
        stopped = "too_many";
        break;
      }
      current = next;
    }
    return { hops, final, stopped, failure };
  }

  // Address ko usi qanoon se parakhta hai jo request istemal karti hai (taake dono ek jaise rahen)
  const parse = (input: string): URL => parseTargetUrl(input, ports);

  return { request, follow, parse };
}

export type SafeFetcher = ReturnType<typeof createSafeFetcher>;

export const safeFetcher: SafeFetcher = createSafeFetcher();
