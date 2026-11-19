import type { PostView, Term } from "./types";

// Database ke record ko public page ki shakal (PostView) mein badalna. Sirf hisaab, database nahi chhoota.

// lean() ke baad record ki shakal. Jo hissay purane/admin ke posts mein na hon wo optional hain.
export interface RawPost {
  _id: unknown;
  slug: string;
  title: string;
  contentHtml?: string;
  excerpt?: string;
  publishedAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
  authorName?: string;
  authorLogin?: string;
  category?: unknown;
  categories?: unknown[];
  tags?: unknown[];
  featuredImageUrl?: string;
  featuredImageAlt?: string;
  featuredImageWidth?: number;
  featuredImageHeight?: number;
  featuredImageCardUrl?: string;
  featuredImageCardWidth?: number;
  featuredImageCardHeight?: number;
  metaTitle?: string;
  metaDescription?: string;
  readingMinutes?: number;
}

export interface RawPage {
  _id: unknown;
  slug: string;
  title: string;
  contentHtml?: string;
  excerpt?: string;
  publishedAt: Date;
  updatedAt: Date;
  metaTitle?: string;
  metaDescription?: string;
}

export type TermMap = Map<string, Term>;

const key = (id: unknown): string => String(id);

// Post ke saare term ID jo naam dhoondne ke liye chahiye
export function termIdsOf(posts: RawPost[]): string[] {
  const ids = new Set<string>();
  for (const p of posts) {
    if (p.category) ids.add(key(p.category));
    for (const id of p.categories ?? []) ids.add(key(id));
    for (const id of p.tags ?? []) ids.add(key(id));
  }
  return [...ids];
}

export function toView(raw: RawPost, terms: TermMap): PostView {
  const pick = (ids: unknown[] | undefined): Term[] =>
    (ids ?? []).map((id) => terms.get(key(id))).filter((t): t is Term => t !== undefined);

  const primary = raw.category ? terms.get(key(raw.category)) : undefined;
  const categories: Term[] = [];
  for (const t of [primary, ...pick(raw.categories)]) {
    if (t && !categories.some((c) => c.slug === t.slug)) categories.push(t);
  }

  const published = raw.publishedAt ?? raw.createdAt ?? new Date(0);
  const url = raw.featuredImageUrl ?? "";

  return {
    slug: raw.slug,
    type: "post",
    title: raw.title,
    content: raw.contentHtml ?? "",
    excerpt: raw.excerpt ?? "",
    publishedAt: published,
    modifiedAt: raw.updatedAt ?? published,
    authorLogin: raw.authorLogin ?? "",
    authorName: raw.authorName ?? "",
    categories,
    primaryCategory: primary?.slug ?? categories[0]?.slug,
    tags: pick(raw.tags),
    featuredImage: url
      ? {
          path: url,
          alt: raw.featuredImageAlt ?? "",
          width: raw.featuredImageWidth || undefined,
          height: raw.featuredImageHeight || undefined,
          cardPath: raw.featuredImageCardUrl || undefined,
          cardWidth: raw.featuredImageCardWidth || undefined,
          cardHeight: raw.featuredImageCardHeight || undefined,
        }
      : undefined,
    seo: { title: raw.metaTitle || undefined, description: raw.metaDescription || undefined },
    readingMinutes: raw.readingMinutes ?? 1,
  };
}

export function pageToView(raw: RawPage): PostView {
  return {
    slug: raw.slug,
    type: "page",
    title: raw.title,
    content: raw.contentHtml ?? "",
    excerpt: raw.excerpt ?? "",
    publishedAt: raw.publishedAt,
    modifiedAt: raw.updatedAt ?? raw.publishedAt,
    authorLogin: "",
    authorName: "",
    categories: [],
    tags: [],
    seo: { title: raw.metaTitle || undefined, description: raw.metaDescription || undefined },
    readingMinutes: 1,
  };
}
