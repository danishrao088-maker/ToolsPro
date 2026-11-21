import { Types, isValidObjectId } from "mongoose";
import { Post } from "../models/Post";
import { Term } from "../models/Term";
import { escapeRegex } from "./blogText";
import { ensureDb, isDuplicate } from "./blogRepoShared";
import type { PostFields, PostListQuery, PostRecord, PostRepo, PostStats, TermRef } from "./blogTypes";

// Database wale record ka asli shakal (lean() ka nateeja)
interface RawPost {
  _id: Types.ObjectId;
  title: string;
  slug: string;
  excerpt: string;
  contentHtml: string;
  status: "draft" | "published";
  publishedAt: Date | null;
  category: Types.ObjectId | null;
  categories?: Types.ObjectId[]; // WordPress se aaye posts mein saari categories (parents samet)
  tags: Types.ObjectId[];
  featuredImageUrl: string;
  featuredImageAlt: string;
  metaTitle: string;
  metaDescription: string;
  readingMinutes: number;
  createdAt: Date;
  updatedAt: Date;
}

interface RawTerm {
  _id: Types.ObjectId;
  name: string;
  slug: string;
}

const oid = (id: string) => new Types.ObjectId(id);

// Posts ke category/tag ke naam ek hi sawal me la kar record bana deta hai
async function toRecords(raw: RawPost[]): Promise<PostRecord[]> {
  const ids = new Set<string>();
  for (const post of raw) {
    if (post.category) ids.add(String(post.category));
    for (const id of post.categories ?? []) ids.add(String(id));
    for (const tag of post.tags) ids.add(String(tag));
  }
  const terms = new Map<string, TermRef>();
  if (ids.size > 0) {
    const found = (await Term.find({ _id: { $in: [...ids].map(oid) } }).lean()) as unknown as RawTerm[];
    for (const term of found) terms.set(String(term._id), { id: String(term._id), name: term.name, slug: term.slug });
  }
  const termList = (ids: Array<Types.ObjectId | null | undefined>): TermRef[] => {
    const out: TermRef[] = [];
    for (const id of ids) {
      const term = id ? terms.get(String(id)) : undefined;
      if (term && !out.some((t) => t.id === term.id)) out.push(term);
    }
    return out;
  };
  return raw.map((post) => ({
    id: String(post._id),
    title: post.title,
    slug: post.slug,
    excerpt: post.excerpt,
    contentHtml: post.contentHtml,
    status: post.status,
    publishedAt: post.publishedAt,
    createdAt: post.createdAt,
    updatedAt: post.updatedAt,
    category: post.category ? (terms.get(String(post.category)) ?? null) : null,
    categories: termList([post.category, ...(post.categories ?? [])]),
    tags: post.tags.map((tag) => terms.get(String(tag))).filter((term): term is TermRef => term !== undefined),
    featuredImageUrl: post.featuredImageUrl,
    featuredImageAlt: post.featuredImageAlt,
    metaTitle: post.metaTitle,
    metaDescription: post.metaDescription,
    readingMinutes: post.readingMinutes,
  }));
}

async function one(raw: unknown): Promise<PostRecord | null> {
  if (!raw) return null;
  const [record] = await toRecords([raw as RawPost]);
  return record ?? null;
}

const stored = (fields: PostFields) => ({
  title: fields.title,
  slug: fields.slug,
  excerpt: fields.excerpt,
  contentHtml: fields.contentHtml,
  status: fields.status,
  publishedAt: fields.publishedAt,
  category: fields.categoryId ? oid(fields.categoryId) : null,
  categories: fields.categoryIds.map(oid),
  tags: fields.tagIds.map(oid),
  featuredImageUrl: fields.featuredImageUrl,
  featuredImageAlt: fields.featuredImageAlt,
  metaTitle: fields.metaTitle,
  metaDescription: fields.metaDescription,
  readingMinutes: fields.readingMinutes,
});

async function termId(kind: "category" | "tag", slug: string): Promise<Types.ObjectId | null> {
  const found = (await Term.findOne({ kind, slug }).lean()) as unknown as RawTerm | null;
  return found ? found._id : null;
}

export function createMongoPostRepo(): PostRepo {
  return {
    async slugTaken(slug, exceptId) {
      ensureDb();
      const filter = exceptId && isValidObjectId(exceptId) ? { slug, _id: { $ne: oid(exceptId) } } : { slug };
      return (await Post.exists(filter)) !== null;
    },

    async termsExist(categoryIds, tagIds) {
      ensureDb();
      const categories =
        categoryIds.length === 0 ? true : (await Term.countDocuments({ _id: { $in: categoryIds.map(oid) }, kind: "category" })) === categoryIds.length;
      const tags = tagIds.length === 0 ? true : (await Term.countDocuments({ _id: { $in: tagIds.map(oid) }, kind: "tag" })) === tagIds.length;
      return { categories, tags };
    },

    async insert(fields) {
      ensureDb();
      try {
        const created = await Post.create(stored(fields));
        const record = await one(await Post.findById(created._id).lean());
        if (!record) throw new Error("The saved post could not be read back.");
        return record;
      } catch (error) {
        if (isDuplicate(error)) return "duplicate";
        throw error;
      }
    },

    async update(id, fields) {
      ensureDb();
      if (!isValidObjectId(id)) return null;
      try {
        return await one(await Post.findByIdAndUpdate(oid(id), { $set: stored(fields) }, { new: true, runValidators: true }).lean());
      } catch (error) {
        if (isDuplicate(error)) return "duplicate";
        throw error;
      }
    },

    async setStatus(id, status, publishedAt) {
      ensureDb();
      if (!isValidObjectId(id)) return null;
      return one(await Post.findByIdAndUpdate(oid(id), { $set: { status, publishedAt } }, { new: true }).lean());
    },

    async remove(id) {
      ensureDb();
      if (!isValidObjectId(id)) return false;
      return (await Post.findByIdAndDelete(oid(id)).lean()) !== null;
    },

    async findById(id) {
      ensureDb();
      if (!isValidObjectId(id)) return null;
      return one(await Post.findById(oid(id)).lean());
    },

    async findPublishedBySlug(slug) {
      ensureDb();
      return one(await Post.findOne({ slug, status: "published" }).lean());
    },

    async list(query: PostListQuery) {
      ensureDb();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const filter: Record<string, any> = {};
      if (query.status) filter.status = query.status;
      if (query.q) {
        const pattern = new RegExp(escapeRegex(query.q), "i");
        filter.$or = [{ title: pattern }, { excerpt: pattern }];
      }
      if (query.categorySlug) {
        const id = await termId("category", query.categorySlug);
        if (!id) return { items: [], total: 0 };
        filter.$and = [{ $or: [{ category: id }, { categories: id }] }];
      }
      if (query.tagSlug) {
        const id = await termId("tag", query.tagSlug);
        if (!id) return { items: [], total: 0 };
        filter.tags = id;
      }
      const sort: Record<string, 1 | -1> = query.sort === "published" ? { publishedAt: -1, _id: -1 } : { updatedAt: -1, _id: -1 };
      const [raw, total] = await Promise.all([
        Post.find(filter)
          .sort(sort)
          .skip((query.page - 1) * query.pageSize)
          .limit(query.pageSize)
          .lean(),
        Post.countDocuments(filter),
      ]);
      return { items: await toRecords(raw as unknown as RawPost[]), total };
    },

    async stats(): Promise<PostStats> {
      ensureDb();
      const [posts, published, categories, tags, recent] = await Promise.all([
        Post.countDocuments(),
        Post.countDocuments({ status: "published" }),
        Term.countDocuments({ kind: "category" }),
        Term.countDocuments({ kind: "tag" }),
        Post.find().sort({ updatedAt: -1 }).limit(5).lean(),
      ]);
      return { posts, published, categories, tags, recent: await toRecords(recent as unknown as RawPost[]) };
    },
  };
}