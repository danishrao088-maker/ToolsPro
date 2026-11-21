import { randomBytes } from "node:crypto";

// Blog ke chhote, bina-database ke madadgar: slug, text nikalna, padhne ka waqt.

export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function isValidSlug(value: unknown): value is string {
  return typeof value === "string" && value.length >= 1 && value.length <= 100 && SLUG_PATTERN.test(value);
}

// "Hello, World!" -> "hello-world". Urdu/Roman Urdu ke bina-Latin harf hat jate hain; kuch na bache to "" lautata hai.
export function slugify(text: string): string {
  return text
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/g, "");
}

// Slug pehle se istemal ho to "-2", "-3"... lagata hai
export async function uniqueSlug(base: string, taken: (slug: string) => Promise<boolean>): Promise<string> {
  const root = base === "" ? "post" : base;
  if (!(await taken(root))) return root;
  for (let n = 2; n <= 50; n += 1) {
    const candidate = `${root}-${n}`;
    if (!(await taken(candidate))) return candidate;
  }
  return `${root}-${randomBytes(3).toString("hex")}`;
}

const ENTITIES: Record<string, string> = { "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&#39;": "'", "&nbsp;": " " };

// Saaf kiye hue HTML se sada text (excerpt aur padhne ke waqt ke liye). Nateeja sirf text ki tarah dikhana hai, HTML ki tarah nahi.
export function htmlToText(html: string): string {
  return html
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/&(?:amp|lt|gt|quot|#39|nbsp);/g, (match) => ENTITIES[match] ?? match)
    .replace(/\s+/g, " ")
    .trim();
}

export function truncateText(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const space = cut.lastIndexOf(" ");
  return `${(space > max * 0.6 ? cut.slice(0, space) : cut).trimEnd()}…`;
}

// Takreeban 200 lafz fi minute
export function readingMinutes(text: string): number {
  const words = text === "" ? 0 : text.split(" ").length;
  return Math.max(1, Math.ceil(words / 200));
}

export function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export const isObjectIdString = (value: unknown): value is string => typeof value === "string" && /^[a-f0-9]{24}$/i.test(value);