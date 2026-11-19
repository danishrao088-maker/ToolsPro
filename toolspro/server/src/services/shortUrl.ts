import { randomInt } from "node:crypto";
import { isIP } from "node:net";
import { AppError } from "../utils/AppError";

// URL Shortener ke qawaid (sirf hisaab kitaab, database yahan nahi): code banana aur kaun sa address qabool hai.

export const MAX_DESTINATION = 2048;
export const LINK_LIFETIME_DAYS = 365;
export const CODE_LENGTH = 7;

// 0, 1, l, I, O nahi: parhne mein ghalat fehmi hoti hai
const ALPHABET = "23456789abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ";

export function generateCode(pick: (max: number) => number = (max) => randomInt(max)): string {
  let code = "";
  for (let i = 0; i < CODE_LENGTH; i += 1) code += ALPHABET[pick(ALPHABET.length)]!;
  return code;
}

// Link kholte waqt code ki shakal dekhte hain (database tak ghalat cheez jaane se pehle)
export function isValidCode(code: unknown): code is string {
  return typeof code === "string" && /^[A-Za-z0-9]{4,32}$/.test(code);
}

// Doosre shorteners: unke links ko dobara chhota karna aksar chhupane ke liye hota hai
const SHORTENER_HOSTS = [
  "bit.ly", "tinyurl.com", "t.co", "goo.gl", "is.gd", "cutt.ly", "ow.ly", "rebrand.ly", "shorturl.at", "tiny.cc",
  "rb.gy", "buff.ly", "lnkd.in", "s.id", "v.gd", "t.ly", "bl.ink", "soo.gd", "clck.ru", "qr.ae",
];
const BLOCKED_SUFFIXES = [".localhost", ".local", ".internal", ".localdomain", ".home.arpa", ".lan"];

const stripWww = (host: string): string => host.replace(/^www\./, "");

function invalid(message: string): AppError {
  return new AppError(400, "INVALID_URL", message);
}

const EXAMPLE = "Enter the web address you want to shorten, for example https://example.com/a-long-page.";

// Theek ho to saaf kiya hua address lautata hai; warna AppError(400)
export function parseDestination(input: string, ownHosts: string[] = []): string {
  const text = input.trim();
  if (text === "") throw new AppError(400, "VALIDATION_ERROR", EXAMPLE);
  if (text.length > MAX_DESTINATION) throw invalid(`That web address is too long. The maximum is ${MAX_DESTINATION} characters.`);
  if (/[\s\u0000-\u001f]/.test(text)) throw invalid("A web address cannot contain spaces.");

  const hasScheme = /^[a-z][a-z0-9+.-]*:/i.test(text) && !/^[^/?#]*:\d+(?:[/?#]|$)/.test(text); // "example.com:8080" scheme nahi, host:port hai
  if (hasScheme && !/^https?:\/\//i.test(text)) throw invalid("Only http and https web addresses can be shortened.");

  let url: URL;
  try {
    url = new URL(hasScheme ? text : `https://${text}`);
  } catch {
    throw invalid("That does not look like a valid web address.");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") throw invalid("Only http and https web addresses can be shortened.");
  if (url.username !== "" || url.password !== "") throw invalid("The web address must not contain a username or password.");

  const host = url.hostname.replace(/^\[|\]$/g, "").replace(/\.$/, "").toLowerCase();
  if (host === "") throw invalid("That does not look like a valid web address.");
  if (isIP(host) !== 0) throw invalid("Use a domain name, not an IP address.");
  if (!host.includes(".")) throw invalid("Enter a full domain name, for example example.com.");
  if (BLOCKED_SUFFIXES.some((suffix) => host.endsWith(suffix))) throw invalid("This web address cannot be shortened.");
  if (url.port !== "" && url.port !== "80" && url.port !== "443") throw invalid("Use a normal web address without a custom port.");

  const bare = stripWww(host);
  if (ownHosts.some((own) => own !== "" && stripWww(own.toLowerCase()) === bare)) {
    throw invalid("This is already a link on this website, so it cannot be shortened.");
  }
  if (SHORTENER_HOSTS.some((shortener) => bare === shortener || bare.endsWith(`.${shortener}`))) {
    throw invalid("This is already a short link from another service. Use the original long address instead.");
  }

  const result = url.href;
  if (result.length > MAX_DESTINATION) throw invalid(`That web address is too long. The maximum is ${MAX_DESTINATION} characters.`);
  return result;
}