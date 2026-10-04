import { checkHttpUrl, shorten } from "./seoCommon";
import type { TransformResult } from "./types";

export type RobotsMode = "allow-all" | "block-all" | "custom";

export const ROBOTS_MODE_OPTIONS: { value: RobotsMode; label: string }[] = [
  { value: "allow-all", label: "Allow all crawlers to visit everything" },
  { value: "block-all", label: "Ask all crawlers to stay out of the whole site" },
  { value: "custom", label: "Custom rules" },
];

export interface RobotsTxtInput {
  mode: RobotsMode;
  disallowPaths: string;
  allowPaths: string;
  sitemaps: string;
}

const MAX_RULES = 200;
const MAX_PATH_LENGTH = 200;
const MAX_SITEMAPS = 20;

function splitLines(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line !== "");
}

function unique(items: string[]): string[] {
  return [...new Set(items)];
}

function pathProblem(path: string): string | null {
  if (!path.startsWith("/")) return "must start with /, like /private/";
  if (/\s/.test(path)) return "cannot contain spaces";
  if (path.includes("#")) return "cannot contain #";
  if (path.length > MAX_PATH_LENGTH) return `is too long (maximum ${MAX_PATH_LENGTH} characters)`;
  return null;
}

function checkPaths(paths: string[], label: string): string | null {
  if (paths.length > MAX_RULES) return `Too many ${label} rules. The maximum is ${MAX_RULES}.`;
  for (const path of paths) {
    const problem = pathProblem(path);
    if (problem) return `${label} "${shorten(path)}" ${problem}.`;
  }
  return null;
}

export function generateRobotsTxt(input: RobotsTxtInput): TransformResult {
  if (!ROBOTS_MODE_OPTIONS.some((option) => option.value === input.mode)) {
    return { ok: false, error: "Choose a valid rule type." };
  }

  const disallow = unique(splitLines(input.disallowPaths));
  const allow = unique(splitLines(input.allowPaths));
  const sitemapLines = splitLines(input.sitemaps);

  if (input.mode === "custom") {
    const problem = checkPaths(disallow, "Disallow path") ?? checkPaths(allow, "Allow path");
    if (problem) return { ok: false, error: problem };
    if (disallow.length === 0 && allow.length === 0) {
      return { ok: false, error: "Add at least one path, or choose a different rule type." };
    }
  }

  if (sitemapLines.length > MAX_SITEMAPS) {
    return { ok: false, error: `Too many sitemap addresses. The maximum is ${MAX_SITEMAPS}.` };
  }
  const sitemaps: string[] = [];
  for (const line of sitemapLines) {
    const checked = checkHttpUrl(line, "Sitemap address");
    if (!checked.ok) return checked;
    if (!sitemaps.includes(checked.href)) sitemaps.push(checked.href);
  }

  const rules: string[] = ["User-agent: *"];
  if (input.mode === "allow-all") rules.push("Disallow:");
  if (input.mode === "block-all") rules.push("Disallow: /");
  if (input.mode === "custom") {
    for (const path of disallow) rules.push(`Disallow: ${path}`);
    for (const path of allow) rules.push(`Allow: ${path}`);
  }

  const parts: string[] = [rules.join("\n")];
  if (sitemaps.length > 0) parts.push(sitemaps.map((href) => `Sitemap: ${href}`).join("\n"));

  const ignored =
    input.mode !== "custom" && (disallow.length > 0 || allow.length > 0)
      ? " Your path rules were ignored because the rule type is not Custom."
      : "";

  return {
    ok: true,
    output: `${parts.join("\n\n")}\n`,
    message: `robots.txt created. Upload it to the top level of your site, so it is found at /robots.txt.${ignored}`,
  };
}