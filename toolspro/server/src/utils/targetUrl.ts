import { isIP } from "node:net";
import { AppError } from "./AppError";
import { isBlockedAddress } from "./ipGuard";

export const DEFAULT_PORTS = [80, 443, 8080, 8443];
export type AllowedPorts = number[] | "any";

const MAX_URL_LENGTH = 2048;
const BLOCKED_NAMES = ["localhost"];
const BLOCKED_SUFFIXES = [".localhost", ".local", ".internal", ".localdomain", ".home.arpa", ".lan"];

function invalid(message: string): AppError {
  return new AppError(400, "INVALID_URL", message);
}

function notAllowed(): AppError {
  return new AppError(400, "URL_NOT_ALLOWED", "This web address cannot be checked.");
}

// Foydamand tareeqa: bina https:// ke likha address bhi chalta hai. Sirf http aur https qabool hain.
export function parseTargetUrl(input: string, ports: AllowedPorts = DEFAULT_PORTS): URL {
  const text = input.trim();
  if (text === "") throw invalid("Enter a web address, for example example.com.");
  if (text.length > MAX_URL_LENGTH) throw invalid("That web address is too long.");
  if (/[\s\u0000-\u001f]/.test(text)) throw invalid("A web address cannot contain spaces.");

  const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(text) ? text : `https://${text}`;
  let url: URL;
  try {
    url = new URL(withScheme);
  } catch {
    throw invalid("That does not look like a valid web address.");
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") throw invalid("Only http and https addresses can be checked.");
  if (url.username !== "" || url.password !== "") throw invalid("The web address must not contain a username or password.");

  const host = url.hostname.replace(/^\[|\]$/g, "").replace(/\.$/, "").toLowerCase();
  if (host === "") throw invalid("That does not look like a valid web address.");

  if (isIP(host) !== 0) {
    if (isBlockedAddress(host)) throw notAllowed();
  } else {
    if (BLOCKED_NAMES.includes(host) || BLOCKED_SUFFIXES.some((suffix) => host.endsWith(suffix))) throw notAllowed();
    if (!host.includes(".")) throw invalid("Enter a full domain name, for example example.com.");
  }

  if (ports !== "any") {
    const port = url.port === "" ? (url.protocol === "https:" ? 443 : 80) : Number(url.port);
    if (!ports.includes(port)) throw invalid(`Port ${port} cannot be checked. Use a normal web address without a custom port.`);
  }

  url.hash = "";
  return url;
}
