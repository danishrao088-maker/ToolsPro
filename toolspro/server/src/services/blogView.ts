import type { PostRecord, TermRecord, TermRef } from "./blogTypes";

// Database ke record ko API ke jawab (JSON) me badalna. Admin ko zyada cheezein, public ko sirf zaroori.

const iso = (date: Date | null): string | null => (date ? date.toISOString() : null);
const adminTerm = (term: TermRef) => ({ id: term.id, name: term.name, slug: term.slug });
const publicTerm = (term: TermRef) => ({ name: term.name, slug: term.slug });
const image = (post: PostRecord) => ({ url: post.featuredImageUrl, alt: post.featuredImageAlt });

export function adminSummary(post: PostRecord) {
  return {
    id: post.id,
    title: post.title,
    slug: post.slug,
    excerpt: post.excerpt,
    status: post.status,
    publishedAt: iso(post.publishedAt),
    createdAt: post.createdAt.toISOString(),
    updatedAt: post.updatedAt.toISOString(),
    category: post.category ? adminTerm(post.category) : null,
    categories: post.categories.map(adminTerm),
    tags: post.tags.map(adminTerm),
    featuredImage: image(post),
  };
}

export function adminDetail(post: PostRecord) {
  return {
    ...adminSummary(post),
    contentHtml: post.contentHtml,
    readingMinutes: post.readingMinutes,
    seo: { metaTitle: post.metaTitle, metaDescription: post.metaDescription },
  };
}

export function publicSummary(post: PostRecord) {
  return {
    slug: post.slug,
    title: post.title,
    excerpt: post.excerpt,
    publishedAt: iso(post.publishedAt),
    readingMinutes: post.readingMinutes,
    category: post.category ? publicTerm(post.category) : null,
    tags: post.tags.map(publicTerm),
    featuredImage: image(post),
  };
}

export function publicDetail(post: PostRecord) {
  return {
    ...publicSummary(post),
    contentHtml: post.contentHtml,
    updatedAt: post.updatedAt.toISOString(),
    seo: { title: post.metaTitle || post.title, description: post.metaDescription || post.excerpt },
  };
}

export const adminTermView = (term: TermRecord) => ({
  id: term.id,
  name: term.name,
  slug: term.slug,
  description: term.description,
  postCount: term.postCount,
});

export const publicTermView = (term: TermRecord) => ({
  name: term.name,
  slug: term.slug,
  description: term.description,
  postCount: term.postCount,
});

export function pageOf<T>(items: T[], total: number, page: number, pageSize: number) {
  return { items, page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
}