// Naap aur status ko insani zubaan mein likhne ke chhote madadgar

export function formatMs(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) return "—";
  if (ms < 1000) return `${Math.round(ms)} ms`;
  const seconds = ms / 1000;
  return `${seconds < 10 ? seconds.toFixed(1) : Math.round(seconds)} s`;
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const MEANINGS: Record<number, string> = {
  200: "OK. The page was found and sent.",
  201: "Created.",
  204: "No content. The request worked but there is nothing to show.",
  301: "Moved permanently. The address has a new home.",
  302: "Found. The address is temporarily somewhere else.",
  303: "See other. The browser is sent to another address.",
  304: "Not modified.",
  307: "Temporary redirect. The address is temporarily somewhere else.",
  308: "Permanent redirect. The address has a new home.",
  400: "Bad request. The server did not understand the request.",
  401: "Unauthorized. The page needs a login.",
  403: "Forbidden. The server refused to show this page to us.",
  404: "Not found. There is no page at this address.",
  405: "Method not allowed.",
  408: "Request timeout.",
  410: "Gone. The page was removed on purpose.",
  429: "Too many requests. The site is limiting visitors.",
  500: "Internal server error. Something broke on the site.",
  502: "Bad gateway. A server behind the site gave a bad answer.",
  503: "Service unavailable. The site is overloaded or down for maintenance.",
  504: "Gateway timeout. A server behind the site was too slow.",
};

export function statusMeaning(status: number): string {
  const known = MEANINGS[status];
  if (known) return known;
  if (status >= 100 && status < 200) return "Informational response.";
  if (status >= 200 && status < 300) return "Success.";
  if (status >= 300 && status < 400) return "Redirect. The address points somewhere else.";
  if (status >= 400 && status < 500) return "Client error. The request was not accepted.";
  if (status >= 500 && status < 600) return "Server error. The site had a problem.";
  return "Unknown status.";
}

// Sirf http/https address ko link banaya jata hai (kisi doosri site ka address kabhi seedha link nahi banta)
export function safeHttpUrl(value: string): string | null {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? url.href : null;
  } catch {
    return null;
  }
}

const REASONS: Record<string, string> = {
  DNS_FAILED: "The domain name was not found",
  CONNECTION_REFUSED: "The server refused the connection",
  CONNECTION_RESET: "The connection was closed",
  TIMEOUT: "The server did not answer in time",
  TLS_ERROR: "The secure (HTTPS) connection failed",
  UNREACHABLE: "The server could not be reached",
  REQUEST_FAILED: "The request failed",
};

export function failureTitle(reason: string): string {
  return REASONS[reason] ?? "The request failed";
}
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

// "1995-08-14T04:00:00.000Z" -> "14 August 1995" (UTC tareekh)
export function formatDate(iso: string): string {
  const time = Date.parse(iso);
  if (Number.isNaN(time)) return "—";
  const date = new Date(time);
  return `${date.getUTCDate()} ${MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}

const plural = (value: number, word: string) => `${value} ${word}${value === 1 ? "" : "s"}`;

export function formatAge(age: { years: number; months: number; days: number }): string {
  const parts: string[] = [];
  if (age.years > 0) parts.push(plural(age.years, "year"));
  if (age.months > 0) parts.push(plural(age.months, "month"));
  if (age.days > 0) parts.push(plural(age.days, "day"));
  return parts.length === 0 ? "Less than a day" : parts.join(", ");
}