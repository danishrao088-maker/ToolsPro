import { checkHttpUrl, cleanText, escapeMarkup, shorten } from "./seoCommon";

export type CitationStyle = "apa" | "mla";
export type SourceType = "book" | "article" | "website";

export const STYLE_OPTIONS: { value: CitationStyle; label: string }[] = [
  { value: "apa", label: "APA (7th edition)" },
  { value: "mla", label: "MLA (9th edition)" },
];

export const SOURCE_OPTIONS: { value: SourceType; label: string }[] = [
  { value: "book", label: "Book" },
  { value: "article", label: "Journal article" },
  { value: "website", label: "Web page" },
];

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

// MLA lamba mahina chhota likhta hai (Jan., Sept.), lekin May, June aur July poore likhe jate hain
const MLA_MONTHS = ["Jan.", "Feb.", "Mar.", "Apr.", "May", "June", "July", "Aug.", "Sept.", "Oct.", "Nov.", "Dec."];

export const MONTH_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "Not set" },
  ...MONTHS.map((label, index) => ({ value: String(index + 1), label })),
];

export interface CitationInput {
  style: CitationStyle;
  source: SourceType;
  authors: string; // har line par ek: "Family, Given"
  title: string;
  year: string;
  month: string; // sirf web page ke liye
  day: string; // sirf web page ke liye
  container: string; // journal ka naam (article) ya site ka naam (web page)
  publisher: string; // sirf book
  edition: string; // sirf book
  volume: string; // sirf article
  issue: string; // sirf article
  pages: string; // sirf article
  link: string; // DOI ya web address
}

// Citation ko tukron mein rakhte hain, taake italic wale hisse ko screen par aur clipboard mein alag dikha saken
export interface Segment {
  text: string;
  italic: boolean;
}

export type CitationResult =
  | { ok: true; segments: Segment[]; plain: string; html: string; message: string }
  | { ok: false; error: string };

type Author = { kind: "person"; family: string; given: string } | { kind: "org"; name: string };

interface DateParts {
  year: string;
  month: number | null;
  day: number | null;
}

interface Context {
  source: SourceType;
  authors: Author[];
  title: string;
  date: DateParts;
  container: string;
  publisher: string;
  edition: string;
  volume: string;
  issue: string;
  pages: string;
  link: string;
}

const MAX_AUTHORS = 20;
const MAX_AUTHOR_LENGTH = 100;
const MAX_TITLE_LENGTH = 500;
const MAX_FIELD_LENGTH = 200;

type Failure = { ok: false; error: string };
const fail = (error: string): Failure => ({ ok: false, error });

const endsWithPunctuation = (text: string) => /[.?!]$/.test(text);
const ensurePeriod = (text: string) => (endsWithPunctuation(text) ? text : `${text}.`);

export function segmentsToHtml(segments: Segment[]): string {
  return segments
    .map((segment) => (segment.italic ? `<i>${escapeMarkup(segment.text)}</i>` : escapeMarkup(segment.text)))
    .join("");
}

// ---------- Authors ----------

function parseAuthors(text: string): { ok: true; authors: Author[] } | Failure {
  const lines = text
    .split(/\r?\n/)
    .map(cleanText)
    .filter((line) => line !== "");

  if (lines.length > MAX_AUTHORS) return fail(`You can enter up to ${MAX_AUTHORS} authors.`);

  const authors: Author[] = [];
  for (const line of lines) {
    if (line.length > MAX_AUTHOR_LENGTH) {
      return fail(`The author "${shorten(line)}" is too long. The maximum is ${MAX_AUTHOR_LENGTH} characters.`);
    }
    const comma = line.indexOf(",");
    if (comma === -1) {
      authors.push({ kind: "org", name: line }); // koma nahi = idara (organization)
      continue;
    }
    const family = line.slice(0, comma).trim();
    const given = line.slice(comma + 1).trim();
    if (family === "" || given === "" || given.includes(",")) {
      return fail(`Write "${shorten(line)}" as Family name, Given name, for example Khan, Ali.`);
    }
    authors.push({ kind: "person", family, given });
  }
  return { ok: true, authors };
}

// "Jean-Paul" -> "J.-P.", "Mary Ann" -> "M. A.", "J. R. R." -> "J. R. R."
function initials(given: string): string {
  return given
    .split(/\s+/)
    .filter((word) => word !== "")
    .map((word) =>
      word
        .split("-")
        .filter((part) => part !== "")
        .map((part) => `${(Array.from(part)[0] ?? "").toUpperCase()}.`)
        .join("-")
    )
    .join(" ");
}

function apaAuthors(authors: Author[]): string {
  const names = authors.map((author) =>
    author.kind === "org" ? author.name : `${author.family}, ${initials(author.given)}`
  );
  const last = names[names.length - 1] ?? "";
  if (names.length === 1) return last;
  // APA mein "&" se pehle koma hamesha aata hai, do authors par bhi
  return `${names.slice(0, -1).join(", ")}, & ${last}`;
}

function mlaAuthors(authors: Author[]): string {
  const first = authors[0];
  if (!first) return "";
  const firstName = first.kind === "org" ? first.name : `${first.family}, ${first.given}`;
  if (authors.length >= 3) return `${firstName}, et al.`;

  const second = authors[1];
  if (!second) return firstName;
  // Doosra author normal tarteeb mein likha jata hai: "Given Family"
  const secondName = second.kind === "org" ? second.name : `${second.given} ${second.family}`;
  return `${firstName}, and ${secondName}`;
}

// Web page ka author wohi hai jo site ka naam hai: phir ek jagah chhor dete hain
function authorIsSite(context: Context): boolean {
  if (context.source !== "website" || context.authors.length !== 1) return false;
  const only = context.authors[0];
  return only?.kind === "org" && context.container !== "" && only.name.toLowerCase() === context.container.toLowerCase();
}

// ---------- Dates ----------

function readDate(input: CitationInput, useMonthAndDay: boolean): { ok: true; date: DateParts } | Failure {
  const year = input.year.trim();
  if (year !== "" && (!/^\d{4}$/.test(year) || Number(year) < 1000)) {
    return fail("Enter the year as four digits, like 2026, or leave it empty.");
  }
  if (!useMonthAndDay) return { ok: true, date: { year, month: null, day: null } };

  const monthText = input.month.trim();
  const dayText = input.day.trim();
  if ((monthText !== "" || dayText !== "") && year === "") return fail("Enter a year to use a month or day.");
  if (monthText !== "" && !/^(?:[1-9]|1[0-2])$/.test(monthText)) return fail("Choose a valid month.");
  if (dayText !== "" && !/^\d{1,2}$/.test(dayText)) return fail("The day must be a number from 1 to 31.");
  if (dayText !== "" && monthText === "") return fail("Choose a month to use a day.");

  const month = monthText === "" ? null : Number(monthText);
  const day = dayText === "" ? null : Number(dayText);

  if (month !== null && day !== null) {
    // 30 Feb jaisi tareekh Date mein 2 March ban jati hai, is liye wapas parh kar milate hain
    const probe = new Date(Date.UTC(Number(year), month - 1, day));
    const real =
      probe.getUTCFullYear() === Number(year) && probe.getUTCMonth() === month - 1 && probe.getUTCDate() === day;
    if (!real) return fail("That date does not exist. Check the month and day.");
  }
  return { ok: true, date: { year, month, day } };
}

function apaDate(date: DateParts): string {
  if (date.year === "") return "n.d.";
  if (date.month === null) return date.year;
  const month = MONTHS[date.month - 1] ?? "";
  return date.day === null ? `${date.year}, ${month}` : `${date.year}, ${month} ${date.day}`;
}

function mlaDate(date: DateParts): string {
  if (date.year === "") return "";
  const month = date.month === null ? "" : (MLA_MONTHS[date.month - 1] ?? "");
  return [date.day === null ? "" : String(date.day), month, date.year].filter((part) => part !== "").join(" ");
}

// ---------- Small helpers ----------

function normalizeEdition(value: string): string {
  return cleanText(value).replace(/\s*(?:ed\.?|edition)$/i, "");
}

// Bare DOI (10.1234/abc) ko link bana deta hai, warna http/https address chahiye
function readLink(value: string, label: string): { ok: true; href: string } | Failure {
  const trimmed = value.trim();
  if (trimmed === "") return { ok: true, href: "" };
  if (/^10\.\d{4,9}\/\S+$/.test(trimmed)) return { ok: true, href: `https://doi.org/${trimmed}` };
  const checked = checkHttpUrl(trimmed, label);
  return checked.ok ? { ok: true, href: checked.href } : checked;
}

const apaPages = (pages: string) => pages.replace(/(\d)\s*[-–—]\s*(\d)/g, "$1–$2");

function mlaPages(pages: string): string {
  const normalized = pages.replace(/(\d)\s*[-–—]\s*(\d)/g, "$1-$2");
  return `${/[-,]/.test(normalized) ? "pp." : "p."} ${normalized}`;
}

// ---------- APA 7 ----------

function buildApa(context: Context): Segment[] {
  const segments: Segment[] = [];
  const add = (text: string, italic = false) => {
    segments.push({ text, italic });
  };
  const dateText = `(${apaDate(context.date)})`;

  const addTitle = () => {
    const italic = context.source !== "article";
    const edition = context.source === "book" && context.edition !== "" ? ` (${context.edition} ed.)` : "";
    const end = edition === "" && endsWithPunctuation(context.title) ? "" : ".";
    add(context.title, italic);
    add(`${edition}${end}`);
  };

  if (context.authors.length > 0) {
    add(`${ensurePeriod(apaAuthors(context.authors))} ${dateText}. `);
    addTitle();
    add(" ");
  } else {
    // Author na ho to title author ki jagah aata hai
    addTitle();
    add(` ${dateText}. `);
  }

  if (context.source === "book") {
    add(ensurePeriod(context.publisher));
  } else if (context.source === "website") {
    if (context.container !== "" && !authorIsSite(context)) add(`${ensurePeriod(context.container)} `);
  } else {
    add(context.container, true);
    if (context.volume !== "") {
      add(", ");
      add(context.volume, true);
    }
    if (context.issue !== "") add(`(${context.issue})`);
    if (context.pages !== "") add(`, ${apaPages(context.pages)}`);
    add(".");
  }

  if (context.link !== "") add(context.source === "website" ? context.link : ` ${context.link}`);
  return segments;
}

// ---------- MLA 9 ----------

function buildMla(context: Context): Segment[] {
  const segments: Segment[] = [];
  const add = (text: string, italic = false) => {
    segments.push({ text, italic });
  };

  if (context.authors.length > 0 && !authorIsSite(context)) {
    add(`${ensurePeriod(mlaAuthors(context.authors))} `);
  }

  if (context.source === "book") {
    add(context.title, true);
    add(endsWithPunctuation(context.title) ? " " : ". ");
  } else {
    // Quotes ke andar period ya ?/! aata hai
    add(`“${endsWithPunctuation(context.title) ? context.title : `${context.title}.`}” `);
  }

  // "Container" ke hisse koma se jurte hain, aakhir mein ek period
  const elements: Segment[] = [];
  const element = (text: string, italic = false) => {
    if (text !== "") elements.push({ text, italic });
  };

  if (context.source === "book") {
    element(context.edition === "" ? "" : `${context.edition} ed.`);
    element(context.publisher);
    element(context.date.year);
    element(context.link);
  } else if (context.source === "article") {
    element(context.container, true);
    element(context.volume === "" ? "" : `vol. ${context.volume}`);
    element(context.issue === "" ? "" : `no. ${context.issue}`);
    element(context.date.year);
    element(context.pages === "" ? "" : mlaPages(context.pages));
    element(context.link);
  } else {
    element(context.container, true);
    element(mlaDate(context.date));
    element(context.link);
  }

  elements.forEach((item, index) => {
    if (index > 0) add(", ");
    segments.push(item);
  });
  const lastText = elements[elements.length - 1]?.text ?? "";
  if (elements.length > 0 && !lastText.endsWith(".")) add(".");
  return segments;
}

// ---------- Main ----------

export function generateCitation(input: CitationInput): CitationResult {
  if (!STYLE_OPTIONS.some((option) => option.value === input.style)) return fail("Choose a citation style.");
  if (!SOURCE_OPTIONS.some((option) => option.value === input.source)) return fail("Choose a source type.");

  const title = cleanText(input.title);
  if (title === "") return fail("Enter the title.");
  if (title.length > MAX_TITLE_LENGTH) return fail(`The title is too long. The maximum is ${MAX_TITLE_LENGTH} characters.`);

  const container = cleanText(input.container);
  const publisher = cleanText(input.publisher);
  const edition = normalizeEdition(input.edition);
  const volume = cleanText(input.volume);
  const issue = cleanText(input.issue);
  const pages = cleanText(input.pages);

  const fields: [string, string][] = [
    ["journal or site name", container],
    ["publisher", publisher],
    ["edition", edition],
    ["volume", volume],
    ["issue", issue],
    ["page numbers", pages],
  ];
  for (const [label, value] of fields) {
    if (value.length > MAX_FIELD_LENGTH) return fail(`The ${label} is too long. The maximum is ${MAX_FIELD_LENGTH} characters.`);
  }

  const parsedAuthors = parseAuthors(input.authors);
  if (!parsedAuthors.ok) return parsedAuthors;

  const parsedDate = readDate(input, input.source === "website");
  if (!parsedDate.ok) return parsedDate;

  if (input.source === "book" && publisher === "") return fail("Enter the publisher.");
  if (input.source === "article" && container === "") return fail("Enter the journal name.");
  if (input.source === "article" && issue !== "" && volume === "") {
    return fail("Enter the volume, or clear the issue number.");
  }
  if (input.source === "website" && input.link.trim() === "") return fail("Enter the web address.");

  const parsedLink = readLink(input.link, input.source === "article" ? "DOI or web address" : "Web address");
  if (!parsedLink.ok) return parsedLink;

  // Sirf wohi maloomat istemal hoti hai jo is source type ki hai (baqi fields chhupe hue ho sakte hain)
  const context: Context = {
    source: input.source,
    authors: parsedAuthors.authors,
    title,
    date: parsedDate.date,
    container: input.source === "book" ? "" : container,
    publisher: input.source === "book" ? publisher : "",
    edition: input.source === "book" ? edition : "",
    volume: input.source === "article" ? volume : "",
    issue: input.source === "article" ? issue : "",
    pages: input.source === "article" ? pages : "",
    link: parsedLink.href,
  };

  const segments = input.style === "apa" ? buildApa(context) : buildMla(context);
  const last = segments[segments.length - 1];
  if (last) last.text = last.text.trimEnd();

  const hasOrganization = parsedAuthors.authors.some((author) => author.kind === "org");
  const note = hasOrganization ? " Names written without a comma are treated as organizations." : "";

  return {
    ok: true,
    segments,
    plain: segments.map((segment) => segment.text).join(""),
    html: segmentsToHtml(segments),
    message: `Citation created in ${input.style === "apa" ? "APA 7" : "MLA 9"} style.${note} Check the details against the guide your school or publisher requires.`,
  };
}