import { AppError } from "../utils/AppError";
import { isObjectIdString, isValidSlug } from "./blogText";

// Admin se aane wali cheezon ko jaanchna aur saaf karna. Theek na ho to AppError(400).

export const LIMITS = {
  title: 200,
  excerpt: 300,
  content: 500_000,
  metaTitle: 120,
  metaDescription: 200,
  imageUrl: 500,
  imageAlt: 200,
  tags: 20,
  termName: 60,
  termDescription: 300,
  search: 100,
};

export type PostStatus = "draft" | "published";

export interface PostInput {
  title: string;
  slug: string | undefined;
  excerpt: string;
  contentHtml: string;
  status: PostStatus;
  categoryId: string | null;
  tagIds: string[];
  featuredImageUrl: string;
  featuredImageAlt: string;
  metaTitle: string;
  metaDescription: string;
}

export interface TermInput {
  name: string;
  slug: string | undefined;
  description: string;
}

const bad = (message: string) => new AppError(400, "VALIDATION_ERROR", message);

function record(body: unknown): Record<string, unknown> {
  if (typeof body !== "object" || body === null || Array.isArray(body)) throw bad("Send the details as a JSON object.");
  return body as Record<string, unknown>;
}

// Ek line ka text: faltu khali jagah saaf, hadd se lamba na ho
function line(value: unknown, label: string, max: number, required = false): string {
  if (value === undefined || value === null) {
    if (required) throw bad(`${label} is required.`);
    return "";
  }
  if (typeof value !== "string") throw bad(`${label} must be text.`);
  const text = value.replace(/\s+/g, " ").trim();
  if (required && text === "") throw bad(`${label} is required.`);
  if (text.length > max) throw bad(`${label} must be at most ${max} characters.`);
  return text;
}

function slugField(value: unknown): string | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string") throw bad("The slug must be text.");
  const slug = value.trim().toLowerCase();
  if (slug === "") return undefined;
  if (!isValidSlug(slug)) throw bad("The slug can only contain lowercase letters, numbers and single hyphens, and be at most 100 characters.");
  return slug;
}

function imageUrl(value: unknown): string {
  if (value === undefined || value === null || value === "") return "";
  if (typeof value !== "string") throw bad("The featured image address must be text.");
  const text = value.trim();
  if (text.length > LIMITS.imageUrl) throw bad(`The featured image address must be at most ${LIMITS.imageUrl} characters.`);
  let url: URL;
  try {
    url = new URL(text);
  } catch {
    throw bad("The featured image address is not a valid web address.");
  }
  if (url.protocol !== "https:") throw bad("The featured image address must start with https://.");
  return url.href;
}

export function parsePostInput(body: unknown): PostInput {
  const data = record(body);

  const status = data.status ?? "draft";
  if (status !== "draft" && status !== "published") throw bad('The status must be "draft" or "published".');

  const content = data.contentHtml ?? "";
  if (typeof content !== "string") throw bad("The content must be text.");
  if (content.length > LIMITS.content) throw bad("The content is too long.");

  let categoryId: string | null = null;
  if (data.categoryId !== undefined && data.categoryId !== null && data.categoryId !== "") {
    if (!isObjectIdString(data.categoryId)) throw bad("The selected category is not valid.");
    categoryId = data.categoryId;
  }

  let tagIds: string[] = [];
  if (data.tagIds !== undefined && data.tagIds !== null) {
    if (!Array.isArray(data.tagIds)) throw bad("The tags must be a list.");
    if (!data.tagIds.every(isObjectIdString)) throw bad("One of the selected tags is not valid.");
    tagIds = [...new Set(data.tagIds.map((id) => id.toLowerCase()))];
    if (tagIds.length > LIMITS.tags) throw bad(`A post can have at most ${LIMITS.tags} tags.`);
  }

  return {
    title: line(data.title, "The title", LIMITS.title, true),
    slug: slugField(data.slug),
    excerpt: line(data.excerpt, "The excerpt", LIMITS.excerpt),
    contentHtml: content,
    status,
    categoryId: categoryId === null ? null : categoryId.toLowerCase(),
    tagIds,
    featuredImageUrl: imageUrl(data.featuredImageUrl),
    featuredImageAlt: line(data.featuredImageAlt, "The image description", LIMITS.imageAlt),
    metaTitle: line(data.metaTitle, "The SEO title", LIMITS.metaTitle),
    metaDescription: line(data.metaDescription, "The SEO description", LIMITS.metaDescription),
  };
}

export function parseTermInput(body: unknown, label: string): TermInput {
  const data = record(body);
  return {
    name: line(data.name, `The ${label} name`, LIMITS.termName, true),
    slug: slugField(data.slug),
    description: line(data.description, `The ${label} description`, LIMITS.termDescription),
  };
}

export interface ListQuery {
  page: number;
  pageSize: number;
  status: PostStatus | undefined;
  q: string | undefined;
  categorySlug: string | undefined;
  tagSlug: string | undefined;
}

// Browser ki query string (?page=2&status=draft...). Ghalat cheezein nazar-andaz, sirf hadd ke andar rakhi jati hain.
export function parseListQuery(raw: unknown, defaultPageSize: number): ListQuery {
  const data = typeof raw === "object" && raw !== null ? (raw as Record<string, unknown>) : {};
  const text = (key: string): string | undefined => (typeof data[key] === "string" && data[key] !== "" ? (data[key] as string).trim() : undefined);
  const number = (key: string, fallback: number, min: number, max: number): number => {
    const value = Number(text(key));
    return Number.isInteger(value) && value >= min ? Math.min(value, max) : fallback;
  };
  const status = text("status");
  const q = text("q");
  const category = text("category");
  const tag = text("tag");
  return {
    page: number("page", 1, 1, 100_000),
    pageSize: number("pageSize", defaultPageSize, 1, 50),
    status: status === "draft" || status === "published" ? status : undefined,
    q: q ? q.slice(0, LIMITS.search) : undefined,
    categorySlug: category && isValidSlug(category) ? category : undefined,
    tagSlug: tag && isValidSlug(tag) ? tag : undefined,
  };
}