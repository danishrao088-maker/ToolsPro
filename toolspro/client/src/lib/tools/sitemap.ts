import { plural } from "../format";
import { checkHttpUrl, escapeMarkup, shorten } from "./seoCommon";
import type { TransformResult } from "./types";

export const CHANGE_FREQUENCIES = ["always", "hourly", "daily", "weekly", "monthly", "yearly", "never"] as const;
export type ChangeFrequency = "" | (typeof CHANGE_FREQUENCIES)[number];

export const PRIORITIES: string[] = Array.from({ length: 11 }, (_, i) => (i / 10).toFixed(1));

export interface SitemapInput {
  urls: string;
  changefreq: ChangeFrequency;
  priority: string;
  lastmod: string;
}

export const MAX_SITEMAP_URLS = 5_000;
const MAX_URL_LENGTH = 2_048;

function isRealIsoDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const y = Number(match[1]);
  const m = Number(match[2]);
  const d = Number(match[3]);
  // Feb 30 ban to jata hai (March 2 ban kar), is liye wapas parh kar milate hain
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

export function generateSitemap(input: SitemapInput): TransformResult {
  const lastmod = input.lastmod.trim();
  if (lastmod !== "" && !isRealIsoDate(lastmod)) {
    return { ok: false, error: "Last modified must be a real date in the format YYYY-MM-DD." };
  }
  if (input.changefreq !== "" && !(CHANGE_FREQUENCIES as readonly string[]).includes(input.changefreq)) {
    return { ok: false, error: "Choose a valid change frequency." };
  }
  if (input.priority !== "" && !PRIORITIES.includes(input.priority)) {
    return { ok: false, error: "Choose a valid priority." };
  }

  // Asli line number yaad rakhte hain, taake error mein "Line 3" sahi aaye
  const entries = input.urls
    .split(/\r?\n/)
    .map((text, index) => ({ text: text.trim(), line: index + 1 }))
    .filter((entry) => entry.text !== "");

  if (entries.length === 0) return { ok: false, error: "Enter at least one web address." };
  if (entries.length > MAX_SITEMAP_URLS) {
    return {
      ok: false,
      error: `Too many addresses. The maximum is ${MAX_SITEMAP_URLS.toLocaleString("en-US")} per sitemap.`,
    };
  }

  const hrefs: string[] = [];
  const seen = new Set<string>();
  let duplicates = 0;
  let firstHost = "";
  let firstLine = 0;

  for (const entry of entries) {
    const checked = entry.text.length <= MAX_URL_LENGTH ? checkHttpUrl(entry.text, "Address") : null;
    if (!checked || !checked.ok) {
      return {
        ok: false,
        error: `Line ${entry.line}: "${shorten(entry.text)}" is not a valid web address. Use full addresses that start with http:// or https://, up to ${MAX_URL_LENGTH.toLocaleString("en-US")} characters.`,
      };
    }

    const host = new URL(checked.href).host;
    if (firstHost === "") {
      firstHost = host;
      firstLine = entry.line;
    } else if (host !== firstHost) {
      return {
        ok: false,
        error: `All addresses must belong to one site. Line ${entry.line} uses ${host}, but line ${firstLine} uses ${firstHost}.`,
      };
    }

    if (seen.has(checked.href)) {
      duplicates += 1;
      continue;
    }
    seen.add(checked.href);
    hrefs.push(checked.href);
  }

  const lines: string[] = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  ];
  for (const href of hrefs) {
    lines.push("  <url>");
    lines.push(`    <loc>${escapeMarkup(href)}</loc>`);
    if (lastmod) lines.push(`    <lastmod>${lastmod}</lastmod>`);
    if (input.changefreq) lines.push(`    <changefreq>${input.changefreq}</changefreq>`);
    if (input.priority) lines.push(`    <priority>${input.priority}</priority>`);
    lines.push("  </url>");
  }
  lines.push("</urlset>");

  const note = duplicates > 0 ? ` ${plural(duplicates, "duplicate address", "duplicate addresses")} removed.` : "";

  return {
    ok: true,
    output: `${lines.join("\n")}\n`,
    message: `Sitemap created with ${plural(hrefs.length, "address", "addresses")}.${note}`,
  };
}