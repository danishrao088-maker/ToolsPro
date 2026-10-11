import { isHexColor } from "../qr/qrColor";
import { escapeXml } from "../word/docx";
import { wrapText } from "../flyer/wrapText";

export type ResumePaper = "a4" | "letter";
export type ResumeFont = "sans" | "serif";

export const RESUME_PAPERS: { value: ResumePaper; label: string; width: number; height: number }[] = [
  { value: "a4", label: "A4", width: 595.28, height: 841.89 },
  { value: "letter", label: "US Letter", width: 612, height: 792 },
];

export const RESUME_FONTS: { value: ResumeFont; label: string; css: string }[] = [
  { value: "sans", label: "Clean (Helvetica)", css: "Helvetica, Arial, sans-serif" },
  { value: "serif", label: "Classic (Times)", css: "'Times New Roman', Times, serif" },
];

export const RESUME_COLORS = ["#000000", "#1d4ed8", "#0f766e", "#7e22ce", "#b91c1c", "#374151"];

export const RESUME_LIMITS = { links: 6, experience: 8, projects: 8, education: 6, summary: 1000, bullets: 1000, field: 100, skills: 800, strengths: 300, label: 30, url: 300 };

export interface ResumeLink {
  label: string; // resume par ye naam nazar aata hai (jaise LinkedIn)
  url: string; // click karne par ye khulta hai
}

export interface ExperienceEntry {
  role: string;
  company: string;
  dates: string;
  bullets: string; // har line ek nuqta
}

export interface ProjectEntry {
  name: string;
  tech: string;
  bullets: string; // har line ek nuqta
}

export interface EducationEntry {
  degree: string;
  school: string;
  dates: string;
  note: string;
}

export interface ResumeData {
  name: string;
  title: string;
  email: string;
  phone: string;
  location: string;
  links: ResumeLink[];
  summary: string; // har line ek nuqta
  skills: string; // har line: "Group: item, item"
  experience: ExperienceEntry[];
  projects: ProjectEntry[];
  education: EducationEntry[];
  strengths: string; // comma ya nai line se alag
  paper: ResumePaper;
  font: ResumeFont;
  accent: string;
}

export const EMPTY_LINK: ResumeLink = { label: "", url: "" };
export const EMPTY_EXPERIENCE: ExperienceEntry = { role: "", company: "", dates: "", bullets: "" };
export const EMPTY_PROJECT: ProjectEntry = { name: "", tech: "", bullets: "" };
export const EMPTY_EDUCATION: EducationEntry = { degree: "", school: "", dates: "", note: "" };

export const EMPTY_RESUME: ResumeData = {
  name: "",
  title: "",
  email: "",
  phone: "",
  location: "",
  links: [],
  summary: "",
  skills: "",
  experience: [],
  projects: [],
  education: [],
  strengths: "",
  paper: "a4",
  font: "sans",
  accent: "#000000",
};

// PDF ke standard fonts (Helvetica, Times) sirf Latin huroof jante hain. Urdu, Arabic, emoji unmein nahi chalte.
const ALLOWED = /^[\n\u0020-\u007e\u00a0-\u00ff\u2013\u2014\u2018\u2019\u201a\u201c\u201d\u201e\u2022\u2026\u20ac\u2122]*$/;

export function unsupportedChars(text: string): string[] {
  const bad = new Set<string>();
  for (const char of text.replace(/\r\n?/g, "\n")) {
    if (!ALLOWED.test(char)) bad.add(char);
  }
  return [...bad];
}

// Link ko saaf karta hai: https:// na ho to laga deta hai. Sirf http aur https qabool hain. Galat ho to null.
export function normalizeUrl(input: string): string | null {
  const text = input.trim();
  if (text === "" || /\s/.test(text)) return null;
  if (/^[a-z][a-z0-9+.-]*:(\/\/)?/i.test(text) && !/^https?:\/\//i.test(text) && !/^[^/:]+\.[^/:]+:\d+(\/|$)/.test(text)) return null;
  const withScheme = /^https?:\/\//i.test(text) ? text : `https://${text}`;
  try {
    const url = new URL(withScheme);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    if (!url.hostname.includes(".")) return null;
    return url.href;
  } catch {
    return null;
  }
}

const KNOWN_SITES: [RegExp, string][] = [
  [/(^|\.)linkedin\.com$/, "LinkedIn"],
  [/(^|\.)github\.com$/, "GitHub"],
  [/(^|\.)gitlab\.com$/, "GitLab"],
  [/(^|\.)behance\.net$/, "Behance"],
  [/(^|\.)dribbble\.com$/, "Dribbble"],
  [/(^|\.)medium\.com$/, "Medium"],
  [/(^|\.)stackoverflow\.com$/, "Stack Overflow"],
  [/(^|\.)(twitter|x)\.com$/, "X"],
];

// Naam khali ho to site ke naam se (LinkedIn, GitHub...), warna website ke address se
export function linkLabel(link: ResumeLink): string {
  const typed = link.label.trim();
  if (typed !== "") return typed;
  const url = normalizeUrl(link.url);
  if (!url) return "";
  const host = new URL(url).hostname.replace(/^www\./, "");
  return KNOWN_SITES.find(([pattern]) => pattern.test(host))?.[1] ?? host;
}

export type ResumeMeasure = (text: string, size: number, bold: boolean) => number;

export type ResumeOp =
  | { kind: "text"; page: number; x: number; y: number; text: string; size: number; bold: boolean; color: string; link?: string } // y = text ki neeche wali line, upar se naapi hui
  | { kind: "rule"; page: number; x1: number; x2: number; y: number; color: string; width: number };

export type ResumeLayout = { ok: true; pages: number; ops: ResumeOp[]; width: number; height: number } | { ok: false; error: string };

const MARGIN = 48;
const GRAY = "#374151";
const INK = "#111827";
const RULE = "#6b7280";
export const LINK_COLOR = "#0563c1";

function collectText(d: ResumeData): string {
  return [
    d.name, d.title, d.email, d.phone, d.location, d.summary, d.skills, d.strengths,
    ...d.links.flatMap((l) => [l.label, l.url]),
    ...d.experience.flatMap((e) => [e.role, e.company, e.dates, e.bullets]),
    ...d.projects.flatMap((p) => [p.name, p.tech, p.bullets]),
    ...d.education.flatMap((e) => [e.degree, e.school, e.dates, e.note]),
  ].join("\n");
}

function validate(d: ResumeData): string {
  if (d.name.trim() === "") return "Type your name.";
  if (!isHexColor(d.accent)) return "The colour must look like #000000.";
  if (d.links.length > RESUME_LIMITS.links) return `You can add up to ${RESUME_LIMITS.links} links.`;
  if (d.experience.length > RESUME_LIMITS.experience) return `You can add up to ${RESUME_LIMITS.experience} jobs.`;
  if (d.projects.length > RESUME_LIMITS.projects) return `You can add up to ${RESUME_LIMITS.projects} projects.`;
  if (d.education.length > RESUME_LIMITS.education) return `You can add up to ${RESUME_LIMITS.education} education entries.`;
  for (const [index, link] of d.links.entries()) {
    if (link.url.trim() === "" && link.label.trim() === "") continue;
    if (normalizeUrl(link.url) === null) return `Link ${index + 1} is not a valid web address. Use something like github.com/yourname.`;
  }
  const bad = unsupportedChars(collectText(d));
  if (bad.length > 0) {
    return `These characters cannot be used in the PDF: ${bad.slice(0, 8).join(" ")}. Use English (Latin) letters, numbers and common symbols only.`;
  }
  return "";
}

const clean = (text: string) => text.replace(/\t/g, " ").trim();
const split = (text: string) => text.split(/[,\n]/).map((s) => clean(s)).filter((s) => s !== "");
const lines = (text: string) => text.split(/\r?\n/).map(clean).filter((s) => s !== "");

interface Segment {
  text: string;
  link?: string;
}

export function layoutResume(data: ResumeData, measure: ResumeMeasure): ResumeLayout {
  const problem = validate(data);
  if (problem) return { ok: false, error: problem };

  const paper = RESUME_PAPERS.find((p) => p.value === data.paper) ?? RESUME_PAPERS[0]!;
  const width = paper.width - MARGIN * 2;
  const left = MARGIN;
  const right = paper.width - MARGIN;
  const bottom = paper.height - MARGIN;
  const ops: ResumeOp[] = [];
  let page = 0;
  let y = MARGIN;

  const ensure = (height: number) => {
    if (y + height > bottom && y > MARGIN) {
      page += 1;
      y = MARGIN;
    }
  };
  // baseline: text ki neeche wali line; tareekh ko title ki baraabar line par rakhne ke liye bara size diya jata hai
  const text = (x: number, content: string, size: number, bold: boolean, color: string, baseline: number = size, link?: string) => {
    ops.push(link ? { kind: "text", page, x, y: y + baseline, text: content, size, bold, color, link } : { kind: "text", page, x, y: y + baseline, text: content, size, bold, color });
  };
  const rule = (color: string, thickness: number, at: number = y) => {
    ops.push({ kind: "rule", page, x1: left, x2: right, y: at, color, width: thickness });
  };
  const paragraph = (content: string, x: number, maxWidth: number, size: number, bold: boolean, color: string, lineHeight: number) => {
    for (const line of wrapText(content, maxWidth, (t) => measure(t, size, bold))) {
      ensure(lineHeight);
      if (line !== "") text(x, line, size, bold, color);
      y += lineHeight;
    }
  };
  // Goli wali nuqte, doosri line pehli line ke text ke neeche
  const bullet = (content: string, size: number) => {
    const wrapped = wrapText(content, width - 16, (t) => measure(t, size, false));
    wrapped.forEach((line, index) => {
      ensure(size + 3);
      if (index === 0) text(left + 3, "•", size, false, INK);
      text(left + 16, line, size, false, INK);
      y += size + 3;
    });
    y += 1.5;
  };
  const bulletList = (block: string, size = 10.5) => {
    for (const item of lines(block)) bullet(item, size);
  };
  // "Label: baqi text": label bold, baqi text pehli line par us ke saath, aage ki lines baayen kinare se
  const labeled = (labelText: string, rest: string, size: number, lineHeight: number) => {
    const labelWidth = measure(`${labelText} `, size, true) + 2;
    const clean1 = rest.replace(/\s+/g, " ").trim();
    const first = wrapText(clean1, Math.max(width - labelWidth, 20), (t) => measure(t, size, false));
    const firstLine = first[0] ?? "";
    const remaining = first.length > 1 && first.join(" ") === clean1 ? first.slice(1).join(" ") : "";
    ensure(lineHeight);
    text(left, labelText, size, true, INK);
    if (firstLine !== "") text(left + labelWidth, firstLine, size, false, INK);
    y += lineHeight;
    if (remaining !== "") paragraph(remaining, left, width, size, false, INK, lineHeight);
  };

  let sections = 0;
  const section = (title: string) => {
    const pageBefore = page;
    ensure(70);
    if (sections > 0 && page === pageBefore) {
      y += 2;
      rule(RULE, 0.6);
      y += 10;
    } else {
      y += 4;
    }
    sections += 1;
    text(left, title.toUpperCase(), 13, true, data.accent);
    y += 19;
  };
  // Aik line: baayen taraf text (zaroorat par kai lines), pehli line ke daayen taraf tareekhein
  const headline = (leftText: string, dates: string, size: number) => {
    const datesWidth = dates ? measure(dates, 10, false) + 12 : 0;
    const wrapped = wrapText(leftText, width - datesWidth, (t) => measure(t, size, true));
    wrapped.forEach((line, index) => {
      ensure(size + 4);
      text(left, line, size, true, INK);
      if (index === 0 && dates) text(right - measure(dates, 10, false), dates, 10, false, GRAY, size);
      y += size + 3;
    });
  };

  // Upar ka hissa: naam, title, rabta (sab beech mein)
  const centered = (content: string, size: number, bold: boolean, color: string) => {
    const w = measure(content, size, bold);
    text(paper.width / 2 - w / 2, content, size, bold, color);
  };
  ensure(30);
  centered(data.name.trim(), 22, true, data.accent);
  y += 27;
  if (data.title.trim()) {
    centered(clean(data.title), 11.5, false, GRAY);
    y += 16;
  }

  const segments: Segment[] = [];
  if (data.email.trim()) segments.push({ text: clean(data.email), link: `mailto:${clean(data.email)}` });
  if (data.phone.trim()) segments.push({ text: clean(data.phone) });
  for (const link of data.links) {
    const url = normalizeUrl(link.url);
    const label = linkLabel(link);
    if (url && label) segments.push({ text: label, link: url });
  }
  if (data.location.trim()) segments.push({ text: clean(data.location) });

  const SEP = "  |  ";
  const sepWidth = measure(SEP, 10, false);
  const rows: Segment[][] = [];
  let row: Segment[] = [];
  let rowWidth = 0;
  for (const seg of segments) {
    const w = measure(seg.text, 10, false);
    if (row.length > 0 && rowWidth + sepWidth + w > width) {
      rows.push(row);
      row = [];
      rowWidth = 0;
    }
    rowWidth += (row.length > 0 ? sepWidth : 0) + w;
    row.push(seg);
  }
  if (row.length > 0) rows.push(row);
  for (const items of rows) {
    ensure(15);
    const total = items.reduce((sum, seg, i) => sum + measure(seg.text, 10, false) + (i > 0 ? sepWidth : 0), 0);
    let x = paper.width / 2 - total / 2;
    items.forEach((seg, i) => {
      if (i > 0) {
        text(x, SEP, 10, false, GRAY);
        x += sepWidth;
      }
      const w = measure(seg.text, 10, false);
      text(x, seg.text, 10, false, seg.link ? LINK_COLOR : GRAY, 10, seg.link);
      if (seg.link) rule(LINK_COLOR, 0.6, y + 11.5);
      x += w;
    });
    y += 15;
  }
  y += 6;
  rule(INK, 0.8);
  y += 6;

  const summary = lines(data.summary);
  if (summary.length > 0) {
    section("Summary");
    for (const item of summary) bullet(item, 10.5);
  }

  const skillLines = lines(data.skills);
  if (skillLines.length > 0) {
    section("Technical Skills");
    for (const item of skillLines) {
      const colon = item.indexOf(":");
      if (colon > 0 && colon <= 40) labeled(item.slice(0, colon + 1), item.slice(colon + 1), 10.5, 15);
      else paragraph(item, left, width, 10.5, false, INK, 15);
    }
  }
  
  const jobs = data.experience.filter((e) => e.role.trim() || e.company.trim());
  if (jobs.length > 0) {
    section("Experience");
    for (const job of jobs) {
      ensure(48);
      const title = [clean(job.role), clean(job.company)].filter((s) => s !== "").join(" — ");
      headline(title, clean(job.dates), 11.5);
      bulletList(job.bullets);
      y += 7;
    }
  }

   const projects = data.projects.filter((p) => p.name.trim());
  if (projects.length > 0) {
    section("Projects");
    projects.forEach((project, index) => {
      ensure(60);
      headline(`${index + 1}. ${clean(project.name)}`, "", 11.5);
      if (project.tech.trim()) labeled("Technologies:", clean(project.tech), 10.5, 14);
      const points = lines(project.bullets);
      if (points.length > 0) {
        y += 3;
        ensure(30);
        text(left, "Description:", 10.5, true, INK);
        y += 15;
        for (const item of points) bullet(item, 10.5);
      }
      y += 8;
    });
  }


  const schools = data.education.filter((e) => e.degree.trim() || e.school.trim());
  if (schools.length > 0) {
    section("Education");
    for (const item of schools) {
      ensure(34);
      headline(clean(item.degree) || clean(item.school), clean(item.dates), 11.5);
      if (item.degree.trim() && item.school.trim()) paragraph(clean(item.school), left, width, 10.5, false, INK, 14);
      if (item.note.trim()) paragraph(clean(item.note), left, width, 10.5, false, GRAY, 14);
      y += 7;
    }
  }

  const strengths = split(data.strengths);
  if (strengths.length > 0) {
    section("Strengths");
    paragraph(strengths.join(" || "), left, width, 10.5, false, INK, 14);
  }

  return { ok: true, pages: page + 1, ops, width: paper.width, height: paper.height };
}

// Preview ke liye ek page ko SVG banata hai (asli PDF jaisi jagah par)
export function pageToSvg(layout: Extract<ResumeLayout, { ok: true }>, pageIndex: number, font: ResumeFont): string {
  const css = (RESUME_FONTS.find((f) => f.value === font) ?? RESUME_FONTS[0]!).css;
  const items = layout.ops
    .filter((op) => op.page === pageIndex)
    .map((op) =>
      op.kind === "rule"
        ? `<line x1="${op.x1}" y1="${Math.round(op.y * 100) / 100}" x2="${op.x2}" y2="${Math.round(op.y * 100) / 100}" stroke="${op.color}" stroke-width="${op.width}"/>`
        : `<text x="${Math.round(op.x * 100) / 100}" y="${Math.round(op.y * 100) / 100}" font-family="${css}" font-size="${op.size}"${op.bold ? ' font-weight="700"' : ""} fill="${op.color}" xml:space="preserve">${escapeXml(op.text)}</text>`
    );
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${layout.width}" height="${layout.height}" viewBox="0 0 ${layout.width} ${layout.height}">` +
    `<rect width="${layout.width}" height="${layout.height}" fill="#ffffff"/>${items.join("")}</svg>`
  );
}