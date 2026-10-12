// Domain ki umar nikalne ke pure (bina network) madadgar

export interface DomainAge {
  years: number;
  months: number;
  days: number;
  totalDays: number;
}

const DAY_MS = 86_400_000;

const startOfDay = (date: Date) => Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());

// `from` mein `months` mahine jorta hai. Agar din mahine mein na ho (31 Jan + 1 mahina) to mahine ka aakhri din lete hain.
function addMonths(from: number, months: number): number {
  const start = new Date(from);
  const target = start.getUTCFullYear() * 12 + start.getUTCMonth() + months;
  const year = Math.floor(target / 12);
  const month = target - year * 12;
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return Date.UTC(year, month, Math.min(start.getUTCDate(), lastDay));
}

// Do tareekhon ka calendar farq (saal, mahine, din). Sirf tareekh dekhi jati hai, waqt nahi. Agar `from` baad ki ho to null.
export function ageBetween(from: Date, to: Date): DomainAge | null {
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return null;
  const start = startOfDay(from);
  const end = startOfDay(to);
  if (start > end) return null;
  let months = (to.getUTCFullYear() - from.getUTCFullYear()) * 12 + (to.getUTCMonth() - from.getUTCMonth());
  while (months > 0 && addMonths(start, months) > end) months -= 1;
  const days = Math.round((end - addMonths(start, months)) / DAY_MS);
  return { years: Math.floor(months / 12), months: months % 12, days, totalDays: Math.round((end - start) / DAY_MS) };
}

// Domain ke naam se un naamon ki fehrist jo RDAP mein dhoondhe ja sakte hain (kam az kam 2 hissay).
// "www.example.co.uk" -> ["www.example.co.uk", "example.co.uk"]
export function domainCandidates(host: string, max = 3): string[] {
  const labels = host.split(".").filter(Boolean);
  const out: string[] = [];
  for (let i = 0; i <= labels.length - 2 && out.length < max; i += 1) out.push(labels.slice(i).join("."));
  return out;
}

export interface RdapInfo {
  registeredOn: string | null;
  expiresOn: string | null;
  updatedOn: string | null;
  registrar: string | null;
  nameservers: string[];
  statuses: string[];
}

const asRecord = (value: unknown): Record<string, unknown> | null =>
  typeof value === "object" && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : null;

function toIso(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const time = Date.parse(value);
  return Number.isNaN(time) ? null : new Date(time).toISOString();
}

function eventDate(events: unknown, action: string): string | null {
  if (!Array.isArray(events)) return null;
  for (const item of events) {
    const event = asRecord(item);
    if (event && typeof event["eventAction"] === "string" && event["eventAction"].toLowerCase() === action) {
      const iso = toIso(event["eventDate"]);
      if (iso) return iso;
    }
  }
  return null;
}

function registrarName(entities: unknown): string | null {
  if (!Array.isArray(entities)) return null;
  for (const item of entities) {
    const entity = asRecord(item);
    if (!entity || !Array.isArray(entity["roles"]) || !entity["roles"].includes("registrar")) continue;
    const vcard = entity["vcardArray"];
    const rows = Array.isArray(vcard) && Array.isArray(vcard[1]) ? (vcard[1] as unknown[]) : [];
    for (const row of rows) {
      if (Array.isArray(row) && row[0] === "fn" && typeof row[3] === "string" && row[3].trim() !== "") return row[3].trim().slice(0, 120);
    }
  }
  return null;
}

// RDAP jawab (JSON) se sirf wo cheezein jo hum dikhate hain. Khareedar ki zaati maloomat kabhi nahi li jati.
export function parseRdap(json: unknown): RdapInfo | null {
  const data = asRecord(json);
  if (!data || (data["objectClassName"] !== undefined && data["objectClassName"] !== "domain")) return null;
  const nameservers = Array.isArray(data["nameservers"])
    ? data["nameservers"]
        .map((ns) => asRecord(ns)?.["ldhName"])
        .filter((name): name is string => typeof name === "string" && name !== "")
        .map((name) => name.toLowerCase().slice(0, 100))
        .slice(0, 10)
    : [];
  const statuses = Array.isArray(data["status"])
    ? data["status"].filter((s): s is string => typeof s === "string").map((s) => s.slice(0, 60)).slice(0, 10)
    : [];
  return {
    registeredOn: eventDate(data["events"], "registration"),
    expiresOn: eventDate(data["events"], "expiration"),
    updatedOn: eventDate(data["events"], "last changed"),
    registrar: registrarName(data["entities"]),
    nameservers,
    statuses,
  };
}

// IANA ki bootstrap fehrist se domain ke ending (TLD) ka RDAP address
export function findRdapBase(bootstrap: unknown, tld: string): string | null {
  const services = asRecord(bootstrap)?.["services"];
  if (!Array.isArray(services)) return null;
  for (const service of services) {
    if (!Array.isArray(service) || !Array.isArray(service[0]) || !Array.isArray(service[1])) continue;
    if (!service[0].some((entry) => typeof entry === "string" && entry.toLowerCase() === tld)) continue;
    const urls = service[1].filter((u): u is string => typeof u === "string");
    const chosen = urls.find((u) => u.startsWith("https://"));
    if (chosen) return chosen.endsWith("/") ? chosen : `${chosen}/`;
  }
  return null;
}