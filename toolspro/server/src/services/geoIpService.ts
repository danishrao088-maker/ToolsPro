import { lookup as dnsLookup } from "node:dns/promises";
import { isIP } from "node:net";
import { AppError } from "../utils/AppError";
import { isBlockedAddress } from "../utils/ipGuard";
import { buildDate, normalizeIp, parseIpInput, shapeRecord, type GeoFields, type GeoReader } from "./geoIp";
import { openGeoReader } from "./geoIpReader";

const NOTE =
  "An IP address gives only an approximate place, often the area of the internet provider rather than the exact home or office. VPNs, proxies, company networks and mobile networks can show a different place, and the database can be out of date.";
const UNAVAILABLE = "The location database is not available on this server right now. Please try again later.";
const EXAMPLE = "Enter an IP address or a domain name, for example 8.8.8.8 or example.com.";
const DNS_TIMEOUT_MS = 5000;

export type GeoIpResult =
  | ({
      found: true;
      query: string;
      ip: string;
      ipVersion: 4 | 6;
      resolvedFrom: string | null;
      databaseDate: string | null;
      note: string;
    } & GeoFields)
  | {
      found: false;
      reason: "PRIVATE_ADDRESS" | "NOT_IN_DATABASE" | "NOT_FOUND";
      query: string;
      ip: string | null;
      message: string;
      note: string;
    };

export interface GeoIpDeps {
  loadReader: () => Promise<GeoReader>;
  resolve: (host: string) => Promise<string[]>;
}

async function defaultResolve(host: string): Promise<string[]> {
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error("DNS timeout")), DNS_TIMEOUT_MS);
  });
  try {
    const found = await Promise.race([dnsLookup(host, { all: true }), timeout]);
    return found.map((entry) => entry.address);
  } finally {
    clearTimeout(timer);
  }
}

export function createGeoIpService(deps: GeoIpDeps = { loadReader: () => openGeoReader(), resolve: defaultResolve }) {
  let reader: Promise<GeoReader> | null = null;

  async function getReader(): Promise<GeoReader> {
    if (!reader) reader = deps.loadReader();
    try {
      return await reader;
    } catch {
      reader = null; // database baad mein rakhi jaye to server dobara chalaye baghair chal sake
      throw new AppError(503, "GEOIP_UNAVAILABLE", UNAVAILABLE);
    }
  }

  const notFound = (reason: "PRIVATE_ADDRESS" | "NOT_IN_DATABASE" | "NOT_FOUND", query: string, ip: string | null, message: string): GeoIpResult => ({
    found: false,
    reason,
    query,
    ip,
    message,
    note: NOTE,
  });

  // `input` khali ho to us insaan ka apna IP (clientIp) dekhte hain
  async function lookup(input: string, clientIp: string): Promise<GeoIpResult> {
    const text = input.trim();
    let ip: string;
    let resolvedFrom: string | null = null;
    let query = text;

    if (text === "") {
      const own = normalizeIp(clientIp);
      if (!own) throw new AppError(400, "VALIDATION_ERROR", EXAMPLE);
      ip = own;
      query = own;
    } else {
      const parsed = parseIpInput(text);
      if (parsed.kind === "ip") {
        ip = parsed.ip;
      } else {
        let addresses: string[] = [];
        try {
          addresses = (await deps.resolve(parsed.host)).map((a) => normalizeIp(a)).filter((a): a is string => a !== null);
        } catch {
          addresses = [];
        }
        if (addresses.length === 0) return notFound("NOT_FOUND", text, null, `The domain name ${parsed.host} could not be found.`);
        const publicOnes = addresses.filter((a) => !isBlockedAddress(a));
        const chosen = publicOnes.find((a) => isIP(a) === 4) ?? publicOnes[0];
        if (!chosen) return notFound("PRIVATE_ADDRESS", text, addresses[0]!, `${parsed.host} points to a private or reserved address. These are not on the public internet, so they have no location.`);
        ip = chosen;
        resolvedFrom = parsed.host;
        query = parsed.host;
      }
    }

    if (isBlockedAddress(ip)) {
      return notFound("PRIVATE_ADDRESS", query, ip, `${ip} is a private, local or reserved address. These are not on the public internet, so they have no location.`);
    }

    const db = await getReader();
    let fields: GeoFields | null;
    try {
      fields = shapeRecord(db.get(ip));
    } catch {
      throw new AppError(502, "GEOIP_FAILED", "The location lookup failed. Please try again later.");
    }
    if (!fields) return notFound("NOT_IN_DATABASE", query, ip, "The database has no location for this address.");

    return {
      found: true,
      query,
      ip,
      ipVersion: isIP(ip) === 6 ? 6 : 4,
      resolvedFrom,
      databaseDate: buildDate(db.metadata?.buildEpoch),
      note: NOTE,
      ...fields,
    };
  }

  return { lookup };
}

export const geoIpService = createGeoIpService();