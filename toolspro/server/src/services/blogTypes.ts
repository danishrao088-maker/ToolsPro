import type { ListQuery, PostStatus } from "./blogInput";

// Blog ke andaruni naam (record) aur database ka interface. Database ka kaam interface ke peeche hai,
// taake service bina database ke test ho sake.

export interface TermRef {
  id: string;
  name: string;
  slug: string;
}

export interface PostRecord {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  contentHtml: string;
  status: PostStatus;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  category: TermRef | null;
  tags: TermRef[];
  featuredImageUrl: string;
  featuredImageAlt: string;
  metaTitle: string;
  metaDescription: string;
  readingMinutes: number;
}

// Post ke wo hissay jo admin badal sakta hai
export interface PostFields {
  title: string;
  slug: string;
  excerpt: string;
  contentHtml: string;
  status: PostStatus;
  publishedAt: Date | null;
  categoryId: string | null;
  tagIds: string[];
  featuredImageUrl: string;
  featuredImageAlt: string;
  metaTitle: string;
  metaDescription: string;
  readingMinutes: number;
}

export interface PostListQuery extends ListQuery {
  sort: "published" | "updated";
}

export interface PostStats {
  posts: number;
  published: number;
  categories: number;
  tags: number;
  recent: PostRecord[];
}

export interface PostRepo {
  slugTaken(slug: string, exceptId?: string): Promise<boolean>;
  termsExist(categoryId: string | null, tagIds: string[]): Promise<{ category: boolean; tags: boolean }>;
  insert(fields: PostFields): Promise<PostRecord | "duplicate">;
  update(id: string, fields: PostFields): Promise<PostRecord | "duplicate" | null>;
  setStatus(id: string, status: PostStatus, publishedAt: Date | null): Promise<PostRecord | null>;
  remove(id: string): Promise<boolean>;
  findById(id: string): Promise<PostRecord | null>;
  findPublishedBySlug(slug: string): Promise<PostRecord | null>;
  list(query: PostListQuery): Promise<{ items: PostRecord[]; total: number }>;
  stats(): Promise<PostStats>;
}

export interface TermRecord {
  id: string;
  name: string;
  slug: string;
  description: string;
  postCount: number;
}

export interface TermFields {
  name: string;
  slug: string;
  description: string;
}

export interface TermRepo {
  list(options: { publishedOnly: boolean }): Promise<TermRecord[]>;
  findById(id: string): Promise<TermRecord | null>;
  slugTaken(slug: string, exceptId?: string): Promise<boolean>;
  insert(fields: TermFields): Promise<TermRecord | "duplicate">;
  update(id: string, fields: TermFields): Promise<TermRecord | "duplicate" | null>;
  remove(id: string): Promise<boolean>;
}