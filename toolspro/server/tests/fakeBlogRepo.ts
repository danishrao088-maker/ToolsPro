import type { PostFields, PostListQuery, PostRecord, PostRepo, PostStats, TermFields, TermRecord, TermRef, TermRepo } from "../src/services/blogTypes";

// Tests ke liye memory me chalne wali jhooti repos (asli database jaisa hi hisaab)

export interface FakeTerm extends TermRef {
  kind: "category" | "tag";
  description: string;
}

export function fakePostRepo(terms: FakeTerm[] = []) {
  const posts: PostRecord[] = [];
  const calls = { insert: 0, update: 0 };
  let counter = 0;
  let clock = new Date("2026-11-19T00:00:00.000Z").getTime();
  const tick = () => new Date((clock += 1000));
  const refOf = (id: string | null) => {
    const term = terms.find((t) => t.id === id);
    return term ? { id: term.id, name: term.name, slug: term.slug } : null;
  };
  const build = (id: string, fields: PostFields, createdAt: Date): PostRecord => ({
    id,
    title: fields.title,
    slug: fields.slug,
    excerpt: fields.excerpt,
    contentHtml: fields.contentHtml,
    status: fields.status,
    publishedAt: fields.publishedAt,
    createdAt,
    updatedAt: tick(),
    category: refOf(fields.categoryId),
    tags: fields.tagIds.map(refOf).filter((t): t is TermRef => t !== null),
    featuredImageUrl: fields.featuredImageUrl,
    featuredImageAlt: fields.featuredImageAlt,
    metaTitle: fields.metaTitle,
    metaDescription: fields.metaDescription,
    readingMinutes: fields.readingMinutes,
  });

  const repo: PostRepo & { forceDuplicates: number } = {
    forceDuplicates: 0,
    async slugTaken(slug, exceptId) {
      return posts.some((p) => p.slug === slug && p.id !== exceptId);
    },
    async termsExist(categoryId, tagIds) {
      return {
        category: categoryId === null || terms.some((t) => t.id === categoryId && t.kind === "category"),
        tags: tagIds.every((id) => terms.some((t) => t.id === id && t.kind === "tag")),
      };
    },
    async insert(fields) {
      calls.insert += 1;
      if (repo.forceDuplicates > 0) {
        repo.forceDuplicates -= 1;
        return "duplicate";
      }
      if (posts.some((p) => p.slug === fields.slug)) return "duplicate";
      counter += 1;
      const record = build(`65a0000000000000000001${String(counter).padStart(2, "0")}`, fields, tick());
      posts.push(record);
      return record;
    },
    async update(id, fields) {
      calls.update += 1;
      const index = posts.findIndex((p) => p.id === id);
      if (index < 0) return null;
      if (posts.some((p) => p.slug === fields.slug && p.id !== id)) return "duplicate";
      posts[index] = build(id, fields, posts[index]!.createdAt);
      return posts[index]!;
    },
    async setStatus(id, status, publishedAt) {
      const post = posts.find((p) => p.id === id);
      if (!post) return null;
      post.status = status;
      post.publishedAt = publishedAt;
      post.updatedAt = tick();
      return post;
    },
    async remove(id) {
      const index = posts.findIndex((p) => p.id === id);
      if (index < 0) return false;
      posts.splice(index, 1);
      return true;
    },
    async findById(id) {
      return posts.find((p) => p.id === id) ?? null;
    },
    async findPublishedBySlug(slug) {
      return posts.find((p) => p.slug === slug && p.status === "published") ?? null;
    },
    async list(query: PostListQuery) {
      let found = posts.filter((p) => (query.status ? p.status === query.status : true));
      if (query.q) found = found.filter((p) => p.title.toLowerCase().includes(query.q!.toLowerCase()));
      if (query.categorySlug) found = found.filter((p) => p.category?.slug === query.categorySlug);
      if (query.tagSlug) found = found.filter((p) => p.tags.some((t) => t.slug === query.tagSlug));
      const key = query.sort === "published" ? "publishedAt" : "updatedAt";
      found = [...found].sort((a, b) => (b[key]?.getTime() ?? 0) - (a[key]?.getTime() ?? 0));
      const start = (query.page - 1) * query.pageSize;
      return { items: found.slice(start, start + query.pageSize), total: found.length };
    },
    async stats(): Promise<PostStats> {
      return {
        posts: posts.length,
        published: posts.filter((p) => p.status === "published").length,
        categories: terms.filter((t) => t.kind === "category").length,
        tags: terms.filter((t) => t.kind === "tag").length,
        recent: [...posts].sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()).slice(0, 5),
      };
    },
  };
  return { repo, posts, calls };
}

export function fakeTermRepo(initial: TermRecord[] = []) {
  const terms = [...initial];
  const calls = { insert: 0 };
  let counter = 0;
  const repo: TermRepo & { forceDuplicates: number } = {
    forceDuplicates: 0,
    async list({ publishedOnly }) {
      return terms.map((t) => ({ ...t, postCount: publishedOnly ? Math.floor(t.postCount / 2) : t.postCount }));
    },
    async findById(id) {
      return terms.find((t) => t.id === id) ?? null;
    },
    async slugTaken(slug, exceptId) {
      return terms.some((t) => t.slug === slug && t.id !== exceptId);
    },
    async insert(fields: TermFields) {
      calls.insert += 1;
      if (repo.forceDuplicates > 0) {
        repo.forceDuplicates -= 1;
        return "duplicate";
      }
      if (terms.some((t) => t.slug === fields.slug)) return "duplicate";
      counter += 1;
      const record: TermRecord = { id: `65b0000000000000000001${String(counter).padStart(2, "0")}`, ...fields, postCount: 0 };
      terms.push(record);
      return record;
    },
    async update(id, fields) {
      const index = terms.findIndex((t) => t.id === id);
      if (index < 0) return null;
      if (terms.some((t) => t.slug === fields.slug && t.id !== id)) return "duplicate";
      terms[index] = { ...terms[index]!, ...fields };
      return terms[index]!;
    },
    async remove(id) {
      const index = terms.findIndex((t) => t.id === id);
      if (index < 0) return false;
      terms.splice(index, 1);
      return true;
    },
  };
  return { repo, terms, calls };
}