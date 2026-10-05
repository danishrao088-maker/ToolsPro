import { readFileSync, writeFileSync } from "node:fs";

const FILE = new URL("../src/data/tools.ts", import.meta.url);

const SLUGS = [
  "meta-tag-generator",
  "open-graph-generator",
  "twitter-card-generator",
  "robots-txt-generator",
  "xml-sitemap-generator",
  "keyword-density-checker",
  "small-text-generator",
  "invisible-character",
  "fake-name-generator",
  "html-viewer",
  "hours-calculator",
  "what-is-my-browser",
  "online-text-editor",
  "citation-generator",
];

let text = readFileSync(FILE, "utf8");
let changed = 0;
let problems = 0;

for (const slug of SLUGS) {
  const slugAt = text.indexOf(`slug: "${slug}"`);
  if (slugAt === -1) {
    console.log(`NOT FOUND   ${slug}`);
    problems += 1;
    continue;
  }
  // Is tool ka status wohi pehla "status:" hai jo slug ke baad aata hai
  const statusAt = text.indexOf("status:", slugAt);
  const end = text.indexOf("\n", statusAt);
  const line = text.slice(statusAt, end);

  if (line.includes('"active"')) {
    console.log(`already     ${slug}`);
  } else if (line.includes('"planned"')) {
    text = text.slice(0, statusAt) + line.replace('"planned"', '"active"') + text.slice(end);
    console.log(`activated   ${slug}`);
    changed += 1;
  } else {
    console.log(`UNEXPECTED  ${slug}: ${line.trim()}`);
    problems += 1;
  }
}

if (problems === 0) {
  writeFileSync(FILE, text);
  console.log(`\nDone. ${changed} tool(s) changed.`);
} else {
  console.log(`\n${problems} problem(s). File was NOT changed.`);
  process.exitCode = 1;
}