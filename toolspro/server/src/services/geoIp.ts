import { isIP } from "node:net";
import { AppError } from "../utils/AppError";

// Geo IP Locator ke chhote, seedhe hisse: address samajhna aur database ke record ko saaf shakal dena.
// Database parhne ka kaam geoIpReader.ts karta hai, taake ye file bina database ke bhi test ho sake.

export interface GeoReader {
  get(ip: string): unknown;
  metadata?: { buildEpoch?: Date | number };
}

export interface GeoFields {
  continent: string | null;
  continentCode: string | null;
  country: string | null;
  countryCode: string | null;
  region: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
}

export type ParsedIpInput = { kind: "ip"; ip: string } | { kind: "host"; host: string };

const MAX_INPUT = 255;
const DOMAIN = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9-]{2,63}$/;
const EXAMPLE = "Enter an IP address or a domain name, for example 8.8.8.8 or example.com.";

function invalid(message: string): AppError {
  return new AppError(400, "VALIDATION_ERROR", message);
}

// IP ko ek hi shakal mein badalta hai. IP na ho to null.
export function normalizeIp(value: string): string | null {
  let text = value.trim().replace(/^\[|\]$/g, "");
  const zone = text.indexOf("%");
  if (zone !== -1) text = text.slice(0, zone);
  const version = isIP(text);
  if (version === 0) return null;
  if (version === 4) return text;
  const lower = text.toLowerCase();
  const mapped = /^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/.exec(lower); // ::ffff:1.2.3.4 asal mein IPv4 hai
  if (mapped && isIP(mapped[1]!) === 4) return mapped[1]!;
  return lower;
}

export function parseIpInput(input: string): ParsedIpInput {
  const text = input.trim();
  if (text === "") throw invalid(EXAMPLE);
  if (text.length > MAX_INPUT) throw invalid("That is too long. " + EXAMPLE);
  if (/[\s\u0000-\u001f]/.test(text)) throw invalid("An IP address or domain name cannot contain spaces.");

  const direct = normalizeIp(text);
  if (direct) return { kind: "ip", ip: direct };

  // Poora address (http://..., port, path) bhi chalta hai: sirf host ka hissa lete hain
  const candidate = /^[a-z][a-z0-9+.-]*:\/\//i.test(text) ? text : `http://${text}`;
  let url: URL;
  try {
    url = new URL(candidate);
  } catch {
    throw invalid("That does not look like an IP address or a domain name.");
  }
  if (url.username !== "" || url.password !== "") throw invalid("Enter only an IP address or a domain name.");

  const host = url.hostname.replace(/\.$/, "").toLowerCase();
  const asIp = normalizeIp(host);
  if (asIp) return { kind: "ip", ip: asIp };
  if (!host.includes(".")) throw invalid("Enter a full domain name, for example example.com.");
  if (!DOMAIN.test(host)) throw invalid("That does not look like a valid domain name.");
  return { kind: "host", host };
}

const nameOf = (value: unknown): string | null => {
  const en = (value as { names?: { en?: unknown } } | null | undefined)?.names?.en;
  return typeof en === "string" && en.trim() !== "" ? en.trim() : null;
};

const codeOf = (value: unknown, key: "iso_code" | "code"): string | null => {
  const code = (value as Record<string, unknown> | null | undefined)?.[key];
  return typeof code === "string" && code.trim() !== "" ? code.trim() : null;
};

const coordinate = (value: unknown, limit: number): number | null =>
  typeof value === "number" && Number.isFinite(value) && Math.abs(value) <= limit ? value : null;

// Database ka record (DB-IP / GeoLite2 City ki shakal) ko seedhe maidanon mein badalta hai.
// Kuch kaam ka na mile to null: yani database mein is address ki jagah maloom nahi.
export function shapeRecord(raw: unknown): GeoFields | null {
  if (typeof raw !== "object" || raw === null) return null;
  const record = raw as Record<string, unknown>;
  const subdivisions = Array.isArray(record.subdivisions) ? record.subdivisions : [];
  const location = (record.location ?? {}) as Record<string, unknown>;
  const fields: GeoFields = {
    continent: nameOf(record.continent),
    continentCode: codeOf(record.continent, "code"),
    country: nameOf(record.country),
    countryCode: codeOf(record.country, "iso_code"),
    region: nameOf(subdivisions[0]),
    city: nameOf(record.city),
    latitude: coordinate(location.latitude, 90),
    longitude: coordinate(location.longitude, 180),
  };
  if (fields.latitude === null || fields.longitude === null) {
    fields.latitude = null;
    fields.longitude = null;
  }
  return fields.country === null && fields.city === null && fields.latitude === null ? null : fields;
}

export function buildDate(value: Date | number | undefined): string | null {
  if (value === undefined) return null;
  const date = value instanceof Date ? value : new Date(value < 1e11 ? value * 1000 : value); // seconds ya milliseconds
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}