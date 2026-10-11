import { AppError } from "../utils/AppError";
import { parseHtml, type ParsedHtml } from "./htmlParse";
import { FetchFailure, safeFetcher, type FailReason, type RedirectResult, type SafeFetcher } from "./safeFetch";
import { analyzeMeta, analyzeOpenGraph, scorePage, snoopPage, type PageInfo } from "./webAnalysis";

export interface Failure {
  reason: FailReason;
  message: string;
}

const failureOf = (error: FetchFailure): Failure => ({ reason: error.reason, message: error.message });

const SLOW_MS = 3000;
const CHECK_NOTE = "This check runs from our server. A site can look fine from here and still be down for you, or the other way round.";

function categoryOf(status: number): "info" | "success" | "redirect" | "client_error" | "server_error" | "unknown" {
  if (status >= 100 && status < 200) return "info";
  if (status >= 200 && status < 300) return "success";
  if (status >= 300 && status < 400) return "redirect";
  if (status >= 400 && status < 500) return "client_error";
  if (status >= 500 && status < 600) return "server_error";
  return "unknown";
}

const REDIRECT_MESSAGES: Record<string, string> = {
  too_many: "The address redirects too many times, so the check stopped.",
  loop: "The address redirects in a loop: it comes back to a page it already visited.",
  blocked: "A redirect leads to an address that cannot be checked, so the check stopped there.",
  bad_location: "A redirect has no usable target address.",
};

export function createWebToolService(fetcher: SafeFetcher = safeFetcher) {
  // ---------- Check Server Status ----------
  async function checkStatus(input: string) {
    const url = fetcher.parse(input).href;
    try {
      const res = await fetcher.request(url, { timeoutMs: 10000 });
      const location = res.headers["location"] ?? null;
      return {
        url,
        reachable: true as const,
        status: res.status,
        statusText: res.statusText,
        category: categoryOf(res.status),
        timeMs: res.timeMs,
        address: res.address,
        secure: url.startsWith("https://"),
        redirectsTo: res.status >= 300 && res.status < 400 && location ? location : null,
        headers: Object.entries(res.headers)
          .map(([name, value]) => ({ name, value }))
          .sort((a, b) => a.name.localeCompare(b.name)),
        note: CHECK_NOTE,
      };
    } catch (error) {
      if (error instanceof FetchFailure) return { url, reachable: false as const, failure: failureOf(error), timeMs: error.timeMs, note: CHECK_NOTE };
      throw error;
    }
  }

  // ---------- Redirect Checker ----------
  function redirectNotes(result: RedirectResult): string[] {
    const notes: string[] = [];
    const urls = result.hops.map((hop) => hop.url);
    if (result.hops.length > 1) {
      const first = new URL(urls[0]!);
      const last = new URL(urls[urls.length - 1]!);
      if (first.protocol === "http:" && last.protocol === "https:") notes.push("The address is moved from http to https.");
      if (first.hostname.replace(/^www\./, "") === last.hostname.replace(/^www\./, "") && first.hostname !== last.hostname) {
        notes.push(last.hostname.startsWith("www.") ? "The address is moved to the www version." : "The address is moved to the version without www.");
      }
      if (first.hostname.replace(/^www\./, "") !== last.hostname.replace(/^www\./, "")) notes.push("The address ends on a different domain.");
    }
    const redirects = result.hops.filter((hop) => hop.status >= 300 && hop.status < 400);
    if (redirects.length > 2) notes.push(`There are ${redirects.length} redirects in a row. Fewer is faster.`);
    if (redirects.some((hop) => hop.status === 302 || hop.status === 303 || hop.status === 307)) notes.push("Some redirects are temporary (302, 303 or 307). If the move is permanent, 301 or 308 is usually used.");
    return notes;
  }

  async function checkRedirects(input: string) {
    const start = fetcher.parse(input).href;
    const result = await fetcher.follow(start, { maxRedirects: 10, timeoutMs: 20000 });
    const hops = result.hops.map((hop, index) => {
      let nextUrl: string | null = null;
      if (hop.location) {
        try {
          nextUrl = new URL(hop.location, hop.url).href;
        } catch {
          nextUrl = hop.location;
        }
      }
      const isRedirect = hop.status >= 300 && hop.status < 400;
      return {
        step: index + 1,
        url: hop.url,
        status: hop.status,
        statusText: hop.statusText,
        kind: !isRedirect ? ("final" as const) : hop.status === 301 || hop.status === 308 ? ("permanent" as const) : ("temporary" as const),
        location: nextUrl,
        timeMs: hop.timeMs,
      };
    });
    const last = result.final;
    return {
      startUrl: start,
      hops,
      redirectCount: hops.filter((hop) => hop.kind !== "final").length,
      final: last ? { url: last.url, status: last.status, statusText: last.statusText } : null,
      stopped: result.stopped,
      message: result.failure ? result.failure.message : REDIRECT_MESSAGES[result.stopped] ?? null,
      failure: result.failure ? failureOf(result.failure) : null,
      totalTimeMs: hops.reduce((sum, hop) => sum + hop.timeMs, 0),
      notes: redirectNotes(result),
    };
  }

  // ---------- Is It Down ----------
  async function checkDown(input: string) {
    const start = fetcher.parse(input).href;
    const result = await fetcher.follow(start, { maxRedirects: 5, timeoutMs: 15000 });
    const base = { url: start, note: CHECK_NOTE };
    if (result.failure) {
      return { ...base, verdict: "down" as const, message: `The site could not be reached. ${result.failure.message}`, failure: failureOf(result.failure), status: null, timeMs: result.failure.timeMs, slow: false, finalUrl: result.hops.at(-1)?.url ?? null };
    }
    const final = result.final;
    if (!final) {
      const loopy = result.stopped === "loop" || result.stopped === "too_many";
      return { ...base, verdict: loopy ? ("down" as const) : ("unknown" as const), message: REDIRECT_MESSAGES[result.stopped] ?? "The check could not finish.", failure: null, status: null, timeMs: result.hops.reduce((s, h) => s + h.timeMs, 0), slow: false, finalUrl: result.hops.at(-1)?.url ?? null };
    }
    const totalMs = result.hops.reduce((sum, hop) => sum + hop.timeMs, 0);
    const slow = totalMs > SLOW_MS;
    const common = { ...base, failure: null, status: final.status, statusText: final.statusText, timeMs: totalMs, slow, finalUrl: final.url };
    if (final.status >= 500) return { ...common, verdict: "down" as const, message: `The server answered with an error (${final.status}).` };
    if (final.status >= 400) return { ...common, verdict: "reachable_with_errors" as const, message: `The server is working but answered ${final.status} for this address.` };
    if (result.stopped === "bad_location") return { ...common, verdict: "unknown" as const, message: REDIRECT_MESSAGES["bad_location"]! };
    return { ...common, verdict: "up" as const, message: slow ? "The site is up, but it answered slowly." : "The site is up." };
  }

  // ---------- Online Ping Website Tool (HTTP) ----------
  async function ping(input: string, count = 4) {
    const url = fetcher.parse(input).href;
    const attempts: { seq: number; ok: boolean; status: number | null; timeMs: number; error: string | null }[] = [];
    for (let seq = 1; seq <= count; seq += 1) {
      try {
        const res = await fetcher.request(url, { timeoutMs: 5000 });
        attempts.push({ seq, ok: true, status: res.status, timeMs: res.timeMs, error: null });
      } catch (error) {
        if (error instanceof FetchFailure) attempts.push({ seq, ok: false, status: null, timeMs: error.timeMs, error: error.message });
        else throw error;
      }
    }
    const times = attempts.filter((a) => a.ok).map((a) => a.timeMs);
    return {
      url,
      attempts,
      sent: count,
      received: times.length,
      lossPercent: Math.round(((count - times.length) / count) * 100),
      minMs: times.length ? Math.min(...times) : null,
      maxMs: times.length ? Math.max(...times) : null,
      avgMs: times.length ? Math.round(times.reduce((a, b) => a + b, 0) / times.length) : null,
      note: "This measures how fast the web server answers an HTTP request (including name lookup and connection time). It is not an ICMP ping.",
    };
  }

  // ---------- HTML tools ----------
  async function loadPage(input: string): Promise<{ parsed: ParsedHtml; page: PageInfo }> {
    const start = fetcher.parse(input).href;
    const result = await fetcher.follow(start, { maxRedirects: 5, timeoutMs: 15000, readFinalBody: true, maxBytes: 1_000_000 });
    if (result.failure) throw new AppError(502, "SITE_UNREACHABLE", `The page could not be loaded. ${result.failure.message}`);
    const final = result.final;
    if (!final || (final.status >= 300 && final.status < 400)) {
      throw new AppError(422, "REDIRECT_PROBLEM", REDIRECT_MESSAGES[result.stopped] ?? "The page could not be loaded.");
    }
    const encoding = (final.headers["content-encoding"] ?? "identity").toLowerCase();
    if (encoding !== "identity") {
      throw new AppError(422, "UNSUPPORTED_ENCODING", "This site sent compressed data that this tool cannot read.");
    }
    const type = (final.headers["content-type"] ?? "").toLowerCase();
    const looksLikeHtml = type.includes("html") || (type === "" && final.body.trimStart().startsWith("<"));
    if (!looksLikeHtml) throw new AppError(422, "NOT_HTML", "This address did not return a web page (HTML).");
    return {
      parsed: parseHtml(final.body),
      page: { url: final.url, status: final.status, headers: final.headers, timeMs: final.timeMs, bodyBytes: final.bodyBytes, truncated: final.truncated, redirects: result.hops.length - 1 },
    };
  }

  return {
    checkStatus,
    checkRedirects,
    checkDown,
    ping,
    analyzeMeta: async (input: string) => {
      const { parsed, page } = await loadPage(input);
      return analyzeMeta(parsed, page);
    },
    analyzeOpenGraph: async (input: string) => {
      const { parsed, page } = await loadPage(input);
      return analyzeOpenGraph(parsed, page);
    },
    snoop: async (input: string) => {
      const { parsed, page } = await loadPage(input);
      return snoopPage(parsed, page);
    },
    seoScore: async (input: string) => {
      const { parsed, page } = await loadPage(input);
      return scorePage(parsed, page);
    },
  };
}

export const webToolService = createWebToolService();
