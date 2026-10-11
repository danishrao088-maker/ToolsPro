import { PDFArray, PDFDict, PDFDocument, PDFName, PDFString } from "pdf-lib";
import { beforeAll, describe, expect, it } from "vitest";
import { EMPTY_RESUME, layoutResume, linkLabel, normalizeUrl, pageToSvg, unsupportedChars, type ResumeData, type ResumeMeasure } from "./resumeLayout";
import { buildResumePdf, getResumeMeasure } from "./resumePdf";

let measure: ResumeMeasure;
beforeAll(async () => {
  measure = await getResumeMeasure("sans");
});

const sample: ResumeData = {
  ...EMPTY_RESUME,
  name: "Ali Khan",
  title: "Software Developer",
  email: "ali@example.com",
  phone: "+92 300 0000000",
  location: "Lahore, Pakistan",
  links: [
    { label: "", url: "https://www.linkedin.com/in/ali?utm_source=share" },
    { label: "My GitHub", url: "github.com/ali" },
  ],
  summary: "Developer who builds websites.\nLikes learning.",
  skills: "Frontend: HTML5, CSS3, React\nBackend: Node.js, Express.js",
  experience: [{ role: "Developer", company: "Acme", dates: "2021 - Present", bullets: "Built the website\nFixed bugs" }],
  projects: [{ name: "Fruit Shop", tech: "ASP.NET Core, C#", bullets: "Built login\nBuilt products page" }],
  education: [{ degree: "BS Computer Science", school: "Some University", dates: "2017 - 2021", note: "" }],
  strengths: "Problem Solving, Teamwork",
};

function layout(data: ResumeData) {
  const result = layoutResume(data, measure);
  if (!result.ok) throw new Error(result.error);
  return result;
}

const textOps = (r: ReturnType<typeof layout>) => r.ops.flatMap((op) => (op.kind === "text" ? [op] : []));

describe("unsupportedChars", () => {
  it("accepts Latin text and common symbols", () => {
    expect(unsupportedChars("Café – résumé • “quoted” €5\nline")).toEqual([]);
  });

  it("finds Urdu, Arabic and emoji", () => {
    expect(unsupportedChars("Ali علی 😀")).toEqual(["ع", "ل", "ی", "😀"]);
  });
});

describe("links", () => {
  it("adds https and accepts only web addresses", () => {
    expect(normalizeUrl("github.com/ali")).toBe("https://github.com/ali");
    expect(normalizeUrl("  https://www.linkedin.com/in/ali  ")).toBe("https://www.linkedin.com/in/ali");
    expect(normalizeUrl("localhost:3000")).toBeNull();
    expect(normalizeUrl("example.com:8080/x")).toBe("https://example.com:8080/x");
    expect(normalizeUrl("javascript:alert(1)")).toBeNull();
    expect(normalizeUrl("mailto:a@b.com")).toBeNull();
    expect(normalizeUrl("ftp://example.com")).toBeNull();
    expect(normalizeUrl("two words.com")).toBeNull();
    expect(normalizeUrl("")).toBeNull();
    expect(normalizeUrl("nodot")).toBeNull();
  });

  it("names a link by what the person typed, or by the site", () => {
    expect(linkLabel({ label: "Portfolio", url: "ali.dev" })).toBe("Portfolio");
    expect(linkLabel({ label: "", url: "https://www.linkedin.com/in/ali" })).toBe("LinkedIn");
    expect(linkLabel({ label: "", url: "github.com/ali" })).toBe("GitHub");
    expect(linkLabel({ label: "", url: "www.ali.dev/about" })).toBe("ali.dev");
    expect(linkLabel({ label: "", url: "bad url" })).toBe("");
  });
});

describe("layoutResume checks", () => {
  it("needs a name, a valid colour and Latin letters", () => {
    expect(layoutResume({ ...sample, name: " " }, measure).ok).toBe(false);
    expect(layoutResume({ ...sample, accent: "red" }, measure).ok).toBe(false);
    const urdu = layoutResume({ ...sample, summary: "علی" }, measure);
    expect(!urdu.ok && urdu.error).toContain("cannot be used in the PDF");
  });

  it("rejects a bad link and too many items", () => {
    const bad = layoutResume({ ...sample, links: [{ label: "X", url: "not a link" }] }, measure);
    expect(!bad.ok && bad.error).toContain("Link 1");
    const jobs = Array.from({ length: 9 }, () => ({ role: "A", company: "B", dates: "", bullets: "" }));
    expect(layoutResume({ ...sample, experience: jobs }, measure).ok).toBe(false);
    const links = Array.from({ length: 7 }, () => ({ label: "A", url: "a.com" }));
    expect(layoutResume({ ...sample, links }, measure).ok).toBe(false);
  });

  it("ignores a link row left empty", () => {
    const r = layout({ ...sample, links: [{ label: "", url: "" }] });
    expect(textOps(r).filter((op) => op.link && !op.link.startsWith("mailto:"))).toHaveLength(0);
  });
});

describe("layoutResume", () => {
  it("puts everything on one page with all the text", () => {
    const r = layout(sample);
    expect(r.pages).toBe(1);
    expect([r.width, r.height]).toEqual([595.28, 841.89]);
    const texts = textOps(r).map((op) => op.text);
    for (const expected of ["Ali Khan", "Software Developer", "SUMMARY", "TECHNICAL SKILLS", "EXPERIENCE", "PROJECTS", "EDUCATION", "STRENGTHS", "Developer — Acme", "2021 - Present", "Built the website", "1. Fruit Shop", "Technologies:", "Description:", "BS Computer Science", "Some University", "Problem Solving || Teamwork"]) {
      expect(texts).toContain(expected);
    }
    expect(texts.filter((t) => t === "•")).toHaveLength(2 + 2 + 2);
  });
  it("puts projects before work experience", () => {
    const texts = textOps(layout(sample)).map((op) => op.text);
    expect(texts.indexOf("PROJECTS")).toBeLessThan(texts.indexOf("EXPERIENCE"));
    expect(texts.indexOf("EXPERIENCE")).toBeLessThan(texts.indexOf("EDUCATION"));
  });
  it("shows links by their name and makes only those clickable", () => {
    const r = layout(sample);
    const texts = textOps(r);
    const clickable = texts.filter((op) => op.link);
    expect(clickable.map((op) => [op.text, op.link])).toEqual([
      ["ali@example.com", "mailto:ali@example.com"],
      ["LinkedIn", "https://www.linkedin.com/in/ali?utm_source=share"],
      ["My GitHub", "https://github.com/ali"],
    ]);
    expect(texts.some((op) => op.text.includes("http") || op.text.includes("utm_source"))).toBe(false);
    expect(clickable.every((op) => op.color === "#0563c1")).toBe(true);
    const underlines = r.ops.filter((op) => op.kind === "rule" && op.color === "#0563c1");
    expect(underlines).toHaveLength(3);
  });

  it("centres the name and the contact line", () => {
    const r = layout(sample);
    const name = textOps(r).find((op) => op.text === "Ali Khan")!;
    expect(name.x + measure("Ali Khan", name.size, true) / 2).toBeCloseTo(595.28 / 2, 3);
    const contact = textOps(r).filter((op) => op.y === textOps(r).find((o) => o.text === "ali@example.com")!.y);
    const first = contact[0]!;
    const last = contact[contact.length - 1]!;
    expect((first.x + last.x + measure(last.text, last.size, false)) / 2).toBeCloseTo(595.28 / 2, 3);
  });

  it("wraps a long contact line instead of running off the page", () => {
    const links = Array.from({ length: 6 }, (_, i) => ({ label: `A long link name ${i}`, url: "example.com" }));
    const r = layout({ ...sample, links });
    for (const op of textOps(r)) expect(op.x + measure(op.text, op.size, op.bold)).toBeLessThanOrEqual(595.28 - 48 + 0.5);
    const ys = new Set(textOps(r).filter((op) => op.link).map((op) => op.y));
    expect(ys.size).toBeGreaterThan(1);
  });

  it("writes skills as a bold label then the items", () => {
    const r = layout(sample);
    const label = textOps(r).find((op) => op.text === "Frontend:")!;
    expect(label.bold).toBe(true);
    const items = textOps(r).find((op) => op.text === "HTML5, CSS3, React")!;
    expect(items.bold).toBe(false);
    expect(items.y).toBe(label.y);
    expect(items.x).toBeCloseTo(48 + measure("Frontend: ", 10.5, true) + 2, 3);
  });

  it("right-aligns the dates inside the margin", () => {
    const r = layout(sample);
    const dates = textOps(r).find((op) => op.text === "2021 - Present")!;
    expect(dates.x + measure(dates.text, dates.size, false)).toBeCloseTo(595.28 - 48, 3);
  });

  it("skips empty sections and empty entries", () => {
    const r = layout({ ...EMPTY_RESUME, name: "Ali", experience: [{ role: "", company: "", dates: "5", bullets: "x" }], projects: [{ name: " ", tech: "x", bullets: "y" }] });
    expect(textOps(r).map((op) => op.text)).toEqual(["Ali"]);
  });

  it("starts a new page instead of running past the bottom", () => {
    const many = Array.from({ length: 8 }, (_, i) => ({ role: `Role ${i}`, company: "Company", dates: "2020", bullets: Array.from({ length: 8 }, (_, j) => `Point ${j} about the work done in this job, long enough to take a full line or more of text here`).join("\n") }));
    const r = layout({ ...sample, experience: many });
    expect(r.pages).toBeGreaterThan(1);
    for (const op of r.ops) expect(op.y).toBeLessThanOrEqual(841.89 - 48 + 0.001);
    expect(new Set(r.ops.map((op) => op.page)).size).toBe(r.pages);
  });

  it("wraps a long job title but keeps the date on the first line", () => {
    const longTitle = "Senior Software Development Engineer and Technical Lead for Platform Services — Very Long Company Name Incorporated";
    const r = layout({ ...sample, experience: [{ role: longTitle, company: "", dates: "2019 - 2023", bullets: "" }] });
    const dates = textOps(r).find((op) => op.text === "2019 - 2023")!;
    const titleLines = textOps(r).filter((op) => op.bold && op.size === 11.5 && op.x === 48 && op.y >= dates.y && op.y < dates.y + 60 && op.text !== "Ali Khan");
    expect(titleLines.length).toBeGreaterThan(1);
    expect(titleLines[0]!.y).toBe(dates.y);
    for (const op of titleLines) expect(op.x + measure(op.text, 11.5, true)).toBeLessThanOrEqual(595.28 - 48 + 0.5);
  });

  it("does not leave a stray line at the top of a new page", () => {
    const many = Array.from({ length: 8 }, (_, i) => ({ role: `Role ${i}`, company: "Company", dates: "2020", bullets: Array.from({ length: 8 }, (_, j) => `Point ${j} about the work done in this job, long enough to take a full line or more of text here`).join("\n") }));
    const r = layout({ ...sample, experience: many });
    for (let p = 1; p < r.pages; p += 1) {
      const first = r.ops.filter((op) => op.page === p).sort((a, b) => a.y - b.y)[0]!;
      expect(first.kind).toBe("text");
    }
  });

  it("uses the Letter size", () => {
    expect([layout({ ...sample, paper: "letter" }).width, layout({ ...sample, paper: "letter" }).height]).toEqual([612, 792]);
  });
});

describe("pageToSvg", () => {
  it("draws the text of one page and escapes it", () => {
    const r = layout({ ...sample, summary: "R&D <lead>" });
    const svg = pageToSvg(r, 0, "sans");
    expect(svg).toContain(">Ali Khan</text>");
    expect(svg).toContain("R&amp;D &lt;lead&gt;");
    expect(svg).toContain("<line ");
    expect(pageToSvg(r, 5, "sans")).not.toContain("<text");
  });
});

describe("buildResumePdf", () => {
  it("makes a real PDF with the right pages and size", async () => {
    const bytes = await buildResumePdf(layout(sample), "sans", "Ali Khan - Resume");
    expect(new TextDecoder().decode(bytes.slice(0, 5))).toBe("%PDF-");
    const doc = await PDFDocument.load(bytes);
    expect(doc.getPageCount()).toBe(1);
    expect(doc.getPage(0).getWidth()).toBeCloseTo(595.28, 1);
    expect(doc.getTitle()).toBe("Ali Khan - Resume");
  });

  it("puts a clickable link behind each link name", async () => {
    const doc = await PDFDocument.load(await buildResumePdf(layout(sample), "sans", "x"));
    const annots = doc.getPage(0).node.lookup(PDFName.of("Annots"), PDFArray);
    const uris: string[] = [];
    for (let i = 0; i < annots.size(); i += 1) {
      const annot = annots.lookup(i, PDFDict);
      const action = annot.lookup(PDFName.of("A"), PDFDict);
      const uri = action.lookup(PDFName.of("URI"), PDFString);
      uris.push(uri.decodeText());
      const rect = annot.lookup(PDFName.of("Rect"), PDFArray);
      expect(rect.size()).toBe(4);
    }
    expect(uris).toEqual(["mailto:ali@example.com", "https://www.linkedin.com/in/ali?utm_source=share", "https://github.com/ali"]);
  });

  it("works with the serif font and several pages", async () => {
    const serif = await getResumeMeasure("serif");
    const jobs = Array.from({ length: 8 }, (_, i) => ({ role: `Role ${i}`, company: "Co", dates: "", bullets: "A point\n".repeat(8) }));
    const r = layoutResume({ ...sample, font: "serif", experience: jobs }, serif);
    if (!r.ok) throw new Error(r.error);
    const doc = await PDFDocument.load(await buildResumePdf(r, "serif", "x"));
    expect(doc.getPageCount()).toBe(r.pages);
  });
});