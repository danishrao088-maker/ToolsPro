import { isIP } from "node:net";
import { AppError } from "../utils/AppError";
import { safeFetcher, type SafeFetcher } from "./safeFetch";
import { ageBetween, domainCandidates, findRdapBase, parseRdap } from "./domainAge";

const BOOTSTRAP_URL = "https://data.iana.org/rdap/dns.json";
const BOOTSTRAP_TTL_MS = 24 * 60 * 60 * 1000;
const RDAP_HEADERS = { accept: "application/rdap+json, application/json" };

const NOTE =
  "The date is when the current registration record was created. A domain that expired and was registered again can show a newer date than the website's real history. The data comes from the public registry (RDAP).";

export function createDomainAgeService(fetcher: SafeFetcher = safeFetcher, now: () => Date = () => new Date()) {
  let bootstrap: { at: number; data: unknown } | null = null;

  async function getJson(url: string, label: string): Promise<{ status: number; json: unknown }> {
    const result = await fetcher.follow(url, { maxRedirects: 3, timeoutMs: 10000, readFinalBody: true, maxBytes: 600_000, headers: RDAP_HEADERS });
    if (result.failure || !result.final) {
      throw new AppError(502, "RDAP_UNAVAILABLE", `The ${label} could not be reached right now. Please try again later.`);
    }
    const { status, body } = result.final;
    let json: unknown = null;
    try {
      json = JSON.parse(body);
    } catch {
      json = null;
    }
    return { status, json };
  }

  async function loadBootstrap(): Promise<unknown> {
    if (bootstrap && now().getTime() - bootstrap.at < BOOTSTRAP_TTL_MS) return bootstrap.data;
    const { status, json } = await getJson(BOOTSTRAP_URL, "list of domain registries");
    if (status !== 200 || json === null) throw new AppError(502, "RDAP_UNAVAILABLE", "The list of domain registries could not be loaded right now. Please try again later.");
    bootstrap = { at: now().getTime(), data: json };
    return json;
  }

  async function check(input: string) {
    const parsed = fetcher.parse(input);
    const host = parsed.hostname.replace(/^\[|\]$/g, "").replace(/\.$/, "").toLowerCase();
    if (isIP(host) !== 0) throw new AppError(400, "VALIDATION_ERROR", "Enter a domain name such as example.com, not an IP address.");

    const candidates = domainCandidates(host);
    const tld = host.split(".").pop() ?? "";
    const base = findRdapBase(await loadBootstrap(), tld);
    if (!base) {
      return {
        domain: candidates[candidates.length - 1] ?? host,
        found: false as const,
        reason: "UNSUPPORTED_TLD" as const,
        message: `Domains ending in .${tld} do not publish their registration data through RDAP, so the age cannot be found here.`,
      };
    }

    for (const name of candidates) {
      const { status, json } = await getJson(`${base}domain/${encodeURIComponent(name)}`, "registry");
      if (status === 404) continue;
      if (status === 429) throw new AppError(429, "RDAP_BUSY", "The registry is limiting requests right now. Please try again in a few minutes.");
      if (status !== 200) throw new AppError(502, "RDAP_UNAVAILABLE", `The registry answered with an error (${status}). Please try again later.`);
      const info = parseRdap(json);
      if (!info) throw new AppError(502, "RDAP_UNAVAILABLE", "The registry sent an answer this tool cannot read.");
      const age = info.registeredOn ? ageBetween(new Date(info.registeredOn), now()) : null;
            return { domain: name, found: true as const, ...info, age, checkedAt: now().toISOString(), registryHost: new URL(base).hostname, note: NOTE };    }

    return {
      domain: candidates[candidates.length - 1] ?? host,
      found: false as const,
      reason: "NOT_FOUND" as const,
      message: "No registration record was found. The domain may not be registered, or the name may be mistyped.",
    };
  }

  return { check };
}

export const domainAgeService = createDomainAgeService();