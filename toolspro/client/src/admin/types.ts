export interface TermRef {
  id: string;
  name: string;
  slug: string;
}

export type PostStatus = "draft" | "published";

export interface AdminPostSummary {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  status: PostStatus;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  category: TermRef | null;
  categories: TermRef[];
  tags: TermRef[];
  featuredImage: { url: string; alt: string };
}

export interface AdminPostDetail extends AdminPostSummary {
  contentHtml: string;
  readingMinutes: number;
  seo: { metaTitle: string; metaDescription: string };
}

export interface PageOf<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface AdminTerm {
  id: string;
  name: string;
  slug: string;
  description: string;
  postCount: number;
}

export interface AdminStats {
  totals: { posts: number; published: number; drafts: number; categories: number; tags: number };
  recent: AdminPostSummary[];
}

export interface PostPayload {
  title: string;
  slug: string;
  excerpt: string;
  contentHtml: string;
  status: PostStatus;
  categoryIds: string[];
  tagIds: string[];
  featuredImageUrl: string;
  featuredImageAlt: string;
  metaTitle: string;
  metaDescription: string;
}

export interface TermPayload {
  name: string;
  slug: string;
  description: string;
}

export interface PostListParams {
  page: number;
  pageSize: number;
  q: string;
  status: "" | PostStatus;
  category: string;
}

export type TermKind = "categories" | "tags";
