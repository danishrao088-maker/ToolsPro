

export type WebToolName = "status" | "redirects" | "is-it-down" | "ping" | "meta" | "open-graph" | "snoop" | "seo-score" | "domain-age" | "mobile-friendly" | "page-speed";

export type Level = "good" | "warning" | "missing" | "info";
export interface Failure {
  reason: string;
  message: string;
}

export interface HeaderItem {
  name: string;
  value: string;
}

export type StatusResult =
  | {
      reachable: true;
      url: string;
      status: number;
      statusText: string;
      category: string;
      timeMs: number;
      address: string;
      secure: boolean;
      redirectsTo: string | null;
      headers: HeaderItem[];
      note: string;
    }
  | { reachable: false; url: string; failure: Failure; timeMs: number; note: string };

export interface RedirectHop {
  step: number;
  url: string;
  status: number;
  statusText: string;
  kind: "permanent" | "temporary" | "final";
  location: string | null;
  timeMs: number;
}

export interface RedirectResult {
  startUrl: string;
  hops: RedirectHop[];
  redirectCount: number;
  final: { url: string; status: number; statusText: string } | null;
  stopped: string;
  message: string | null;
  failure: Failure | null;
  totalTimeMs: number;
  notes: string[];
}

export interface DownResult {
  url: string;
  verdict: "up" | "reachable_with_errors" | "down" | "unknown";
  message: string;
  failure: Failure | null;
  status: number | null;
  statusText?: string;
  timeMs: number;
  slow: boolean;
  finalUrl: string | null;
  note: string;
}

export interface PingAttempt {
  seq: number;
  ok: boolean;
  status: number | null;
  timeMs: number;
  error: string | null;
}

export interface PingResult {
  url: string;
  attempts: PingAttempt[];
  sent: number;
  received: number;
  lossPercent: number;
  minMs: number | null;
  maxMs: number | null;
  avgMs: number | null;
  note: string;
}

export interface MetaCheck {
  id: string;
  label: string;
  value: string | null;
  level: Level;
  message: string;
}

export interface MetaResult {
  url: string;
  status: number;
  checks: MetaCheck[];
  summary: { good: number; warning: number; missing: number };
  allMeta: { name: string; content: string }[];
}

export interface OgCheck {
  tag: string;
  value: string | null;
  level: Level;
  message: string;
}

export interface OpenGraphResult {
  url: string;
  status: number;
  openGraph: OgCheck[];
  twitter: OgCheck[];
  preview: { title: string; description: string; image: string | null; siteName: string; host: string };
  otherTags: { tag: string; content: string }[];
  summary: { good: number; warning: number; missing: number };
}

export interface SnoopResult {
  url: string;
  status: number;
  responseTimeMs: number;
  htmlBytes: number;
  truncated: boolean;
  redirects: number;
  headers: HeaderItem[];
  title: string | null;
  description: string | null;
  language: string | null;
  headings: { level: number; text: string }[];
  headingCounts: Record<string, number>;
  links: { total: number; internal: number; external: number; nofollow: number; other: number; items: { href: string; text: string; external: boolean; nofollow: boolean }[] };
  images: { total: number; missingAlt: number; emptyAlt: number };
  scripts: { total: number; inline: number; external: number };
  stylesheets: number;
  wordCount: number;
}

export interface ScoreCheck {
  id: string;
  label: string;
  status: "pass" | "warn" | "fail";
  points: number;
  max: number;
  message: string;
}

export interface ScoreResult {
  url: string;
  score: number;
  verdict: "good" | "needs_work" | "poor";
  checks: ScoreCheck[];
  note: string;
}
export interface DomainAgeParts {
  years: number;
  months: number;
  days: number;
  totalDays: number;
}

export type DomainAgeResult =
  | {
      found: true;
      domain: string;
      registeredOn: string | null;
      expiresOn: string | null;
      updatedOn: string | null;
      registrar: string | null;
      nameservers: string[];
      statuses: string[];
      age: DomainAgeParts | null;
      checkedAt: string;
      registryHost: string;
      note: string;
    }
  | { found: false; domain: string; reason: "NOT_FOUND" | "UNSUPPORTED_TLD"; message: string };
export class WebToolError extends Error {
  code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "WebToolError";
    this.code = code;
  }
}

function errorFrom(payload: unknown, status: number): WebToolError {
  const error = (payload as { error?: { code?: unknown; message?: unknown } } | null)?.error;
  if (error && typeof error.message === "string" && error.message !== "") {
    return new WebToolError(typeof error.code === "string" ? error.code : "ERROR", error.message);
  }
  return new WebToolError("BAD_RESPONSE", `The server sent an unexpected answer (status ${status}). Please try again.`);
}


// Ek web tool chalata hai. Address server ko jata hai, server page kholta hai aur nateeja wapis deta hai.
export async function callWebTool<T>(tool: WebToolName, address: string, signal?: AbortSignal): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/api/web/${tool}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: address }),
      signal,
    });
  } catch (error) {
    if (signal?.aborted) throw error;
    throw new WebToolError("NETWORK", "The server could not be reached. Check your connection and try again.");
  }

  
let payload: unknown = null;
try {
  payload = await response.json();
} catch {
  // Keep payload as null if the response is not valid JSON.
}


  const body = payload as { success?: unknown; data?: unknown } | null;
  if (response.ok && body?.success === true && body.data !== undefined) return body.data as T;
  throw errorFrom(payload, response.status);
}
