import mongoose from "mongoose";
import { Page } from "../models/Page";
import { Post } from "../models/Post";
import { Term as TermModel } from "../models/Term";
import type { PostCard, PostView, Term } from "./types";
import { pageToView, termIdsOf, toView, type RawPage, type RawPost, type TermMap } from "./viewMap";

// Blog ke SEO pages ke saare database queries yahan hain (aap ke Post, Term aur Page models se).
// Routes sirf yahi functions use karte hain.

// DB connected na ho to blog routes chup-chap skip ho jate hain (React app aur API phir bhi chalte hain)
export function blogAvailable(): boolean {
  return mongoose.connection.readyState === 1;
}

export type { PostCard };

export interface Listing {
  items: PostCard[];
  total: number;
  page: number;
  totalPages: number;
}

type ListFilter = { kind: "all" } | { kind: "category" | "tag" | "author"; value: string };

const PUBLISHED = { status: "published" } as const;
const NO_CONTENT = "-contentHtml";

interface RawTerm {
  _id: unknown;
  name: string;
  slug: string;
}

// Posts ke category/tag ke naam ek hi sawal mein la kar card/page bana deta hai
async function hydrate(raw: RawPost[]): Promise<PostView[]> {
  const ids = termIdsOf(raw);
  const terms: TermMap = new Map();
  if (ids.length > 0) {
    const found = (await TermModel.find({ _id: { $in: ids } })
      .select("name slug")
      .lean()) as unknown as RawTerm[];
    for (const t of found) terms.set(String(t._id), { name: t.name, slug: t.slug });
  }
  return raw.map((r) => toView(r, terms));
}

async function termIdFor(kind: "category" | "tag", slug: string): Promise<unknown | null> {
  const found = (await TermModel.findOne({ kind, slug }).select("_id").lean()) as unknown as { _id: unknown } | null;
  return found ? found._id : null;
}

// Category: WordPress ki tarah parent ke archive mein child ke posts bhi aate hain ("categories" mein parents hote hain)
async function filterQuery(filter: ListFilter): Promise<Record<string, unknown> | null> {
  if (filter.kind === "all") return { ...PUBLISHED };
  if (filter.kind === "author") return { ...PUBLISHED, authorLogin: filter.value };
  const id = await termIdFor(filter.kind, filter.value);
  if (!id) return null;
  return filter.kind === "category"
    ? { ...PUBLISHED, $or: [{ category: id }, { categories: id }] }
    : { ...PUBLISHED, tags: id };
}

export async function listPosts(filter: ListFilter, page: number, perPage: number): Promise<Listing> {
  const query = await filterQuery(filter);
  if (!query) return { items: [], total: 0, page, totalPages: 1 };
  const [raw, total] = await Promise.all([
    Post.find(query)
      .select(NO_CONTENT)
      .sort({ publishedAt: -1, _id: -1 })
      .skip((page - 1) * perPage)
      .limit(perPage)
      .lean(),
    Post.countDocuments(query),
  ]);
  const items = (await hydrate(raw as unknown as RawPost[])).map(stripContent);
  return { items, total, page, totalPages: Math.max(1, Math.ceil(total / perPage)) };
}

function stripContent(view: PostView): PostCard {
  const { content: _content, ...card } = view;
  return card;
}

// Pehle post, phir WordPress ka page
export async function getBySlug(slug: string): Promise<PostView | null> {
  const post = (await Post.findOne({ slug, ...PUBLISHED }).lean()) as unknown as RawPost | null;
  if (post) return (await hydrate([post]))[0] ?? null;
  const page = (await Page.findOne({ slug }).lean()) as unknown as RawPage | null;
  return page ? pageToView(page) : null;
}

export async function getRelated(post: PostView, limit: number): Promise<PostCard[]> {
  if (!post.primaryCategory) return [];
  const id = await termIdFor("category", post.primaryCategory);
  if (!id) return [];
  const raw = await Post.find({ ...PUBLISHED, slug: { $ne: post.slug }, $or: [{ category: id }, { categories: id }] })
    .select(NO_CONTENT)
    .sort({ publishedAt: -1, _id: -1 })
    .limit(limit)
    .lean();
  return (await hydrate(raw as unknown as RawPost[])).map(stripContent);
}

// Category ya tag ka naam
export async function getTerm(kind: "category" | "tag", slug: string): Promise<Term | null> {
  const found = (await TermModel.findOne({ kind, slug }).select("name slug").lean()) as unknown as RawTerm | null;
  return found ? { name: found.name, slug: found.slug } : null;
}

export async function getAuthorName(login: string): Promise<string | null> {
  const doc = (await Post.findOne({ ...PUBLISHED, authorLogin: login })
    .select("authorName")
    .lean()) as unknown as { authorName?: string } | null;
  return doc ? doc.authorName || login : null;
}

export interface SitemapData {
  posts: { slug: string; modifiedAt: Date; type: "post" | "page" }[];
  categories: string[];
}

export async function getSitemapData(): Promise<SitemapData> {
  const [posts, pages, mainCats, allCats] = await Promise.all([
    Post.find(PUBLISHED).select("slug updatedAt").sort({ publishedAt: -1, _id: -1 }).lean(),
    Page.find().select("slug updatedAt").lean(),
    Post.distinct("category", PUBLISHED),
    Post.distinct("categories", PUBLISHED),
  ]);
  const catIds = [...new Set([...mainCats, ...allCats].filter(Boolean).map(String))];
  const cats = catIds.length
    ? ((await TermModel.find({ kind: "category", _id: { $in: catIds } })
        .select("slug")
        .sort({ slug: 1 })
        .lean()) as unknown as { slug: string }[])
    : [];
  return {
    posts: [
      ...(posts as unknown as { slug: string; updatedAt: Date }[]).map((p) => ({
        slug: p.slug,
        modifiedAt: p.updatedAt,
        type: "post" as const,
      })),
      ...(pages as unknown as { slug: string; updatedAt: Date }[]).map((p) => ({
        slug: p.slug,
        modifiedAt: p.updatedAt,
        type: "page" as const,
      })),
    ],
    categories: cats.map((c) => c.slug),
  };
}

export async function latestForFeed(limit: number): Promise<PostCard[]> {
  const raw = await Post.find(PUBLISHED).select(NO_CONTENT).sort({ publishedAt: -1, _id: -1 }).limit(limit).lean();
  return (await hydrate(raw as unknown as RawPost[])).map(stripContent);
}
