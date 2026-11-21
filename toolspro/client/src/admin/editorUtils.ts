import type { AdminPostDetail, PostPayload } from "./types";

// Editor ke chhote, bina-screen ke madadgar (taake tests asani se chalein)

// "Hello, World!" -> "hello-world" (server ki slugify jaisa)
export function slugify(text: string): string {
  return text
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/g, "");
}

// Visual editor sirf sada cheezein (headings, text, lists, links, images, tables) sambhalta hai.
// Agar post mein embed (YouTube), video, audio, image captions wagaira hon to Visual mein save karne se wo hat sakte hain,
// isliye aise posts HTML mode mein khulte hain.
const NEEDS_HTML_MODE = /<(iframe|video|audio|embed|object|svg|form|script|style|math|figcaption|details|picture|button)\b/i;

export function needsHtmlMode(html: string): boolean {
  return NEEDS_HTML_MODE.test(html);
}

// Server ki hadd (blogInput LIMITS) ke saath mel khati hon
export const FIELD_LIMITS = {
  title: 200,
  excerpt: 600,
  metaTitle: 160,
  metaDescription: 320,
  imageAlt: 200,
  slug: 100,
} as const;

// Google aam taur par itna dikhata hai (is se zyada kata jata hai)
export const SEO_HINTS = { title: 60, description: 160 } as const;

export function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export function postUrl(slug: string): string {
  return `/${slug}/`;
}

// "mongodb se aaya hua" selected IDs ko ek order mein rakhna: main category sab se pehle
export function moveToFront(ids: string[], id: string): string[] {
  return ids.includes(id) ? [id, ...ids.filter((x) => x !== id)] : ids;
}

export function toggleId(ids: string[], id: string): string[] {
  return ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id];
}

export function emptyPostForm(): PostPayload {
  return {
    title: "",
    slug: "",
    excerpt: "",
    contentHtml: "",
    status: "draft",
    categoryIds: [],
    tagIds: [],
    featuredImageUrl: "",
    featuredImageAlt: "",
    metaTitle: "",
    metaDescription: "",
  };
}

// Server se aayi post ko form ki shakal dena. Main category sab se pehle, doharai hui nahi.
export function postToForm(post: AdminPostDetail): PostPayload {
  const categoryIds: string[] = [];
  for (const term of [post.category, ...post.categories]) {
    if (term && !categoryIds.includes(term.id)) categoryIds.push(term.id);
  }
  return {
    title: post.title,
    slug: post.slug,
    excerpt: post.excerpt,
    contentHtml: post.contentHtml,
    status: post.status,
    categoryIds,
    tagIds: post.tags.map((tag) => tag.id),
    featuredImageUrl: post.featuredImage.url,
    featuredImageAlt: post.featuredImage.alt,
    metaTitle: post.seo.metaTitle,
    metaDescription: post.seo.metaDescription,
  };
}

// Server ki hadd (uploadService) ke mutabiq: JPG/PNG/GIF/WebP, 8 MB tak
export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];

export function checkImageFile(file: { type: string; size: number }): string | null {
  if (!IMAGE_TYPES.includes(file.type)) return "Only JPG, PNG, GIF or WebP pictures can be uploaded.";
  if (file.size > MAX_IMAGE_BYTES) return "The picture is too large (8 MB at most).";
  return null;
}
