import { AppError } from "../utils/AppError";
import { isObjectIdString, htmlToText, isValidSlug, readingMinutes, slugify, truncateText, uniqueSlug } from "./blogText";
import { parseListQuery, parsePostInput, type PostInput, type PostStatus } from "./blogInput";
import type { PostFields, PostRecord, PostRepo } from "./blogTypes";
import { adminDetail, adminSummary, pageOf, publicDetail, publicSummary } from "./blogView";

export interface PostDeps {
  repo: PostRepo;
  // Editor ka HTML saaf karne wala (asli wala sanitize-html se bana hai, tests me jhoota)
  sanitize: (html: string) => string;
  now?: () => Date;
  maxAttempts?: number;
}

const notFound = () => new AppError(404, "NOT_FOUND", "That post was not found.");
const slugTaken = () => new AppError(409, "SLUG_TAKEN", "This slug is already used by another post. Choose a different one.");
const invalid = (message: string) => new AppError(400, "VALIDATION_ERROR", message);

export function createPostService(deps: PostDeps) {
  const { repo, sanitize } = deps;
  const now = deps.now ?? (() => new Date());
  const maxAttempts = deps.maxAttempts ?? 3;

  async function existing(id: string): Promise<PostRecord> {
    if (!isObjectIdString(id)) throw notFound();
    const post = await repo.findById(id);
    if (!post) throw notFound();
    return post;
  }

  // Input jaanchna, category/tags ka maujood hona dekhna, aur HTML saaf karna
  async function prepare(body: unknown) {
    const input = parsePostInput(body);
    const found = await repo.termsExist(input.categoryId, input.tagIds);
    if (!found.category) throw invalid("The selected category does not exist.");
    if (!found.tags) throw invalid("One or more of the selected tags do not exist.");
    const contentHtml = sanitize(input.contentHtml);
    const text = htmlToText(contentHtml);
    if (input.status === "published" && text === "") throw invalid("A published post needs some content.");
    return { input, contentHtml, text };
  }

  function fieldsFrom(prepared: { input: PostInput; contentHtml: string; text: string }, slug: string, publishedAt: Date | null): PostFields {
    const { input, contentHtml, text } = prepared;
    return {
      title: input.title,
      slug,
      excerpt: input.excerpt || truncateText(text, 160),
      contentHtml,
      status: input.status,
      publishedAt,
      categoryId: input.categoryId,
      tagIds: input.tagIds,
      featuredImageUrl: input.featuredImageUrl,
      featuredImageAlt: input.featuredImageAlt,
      metaTitle: input.metaTitle,
      metaDescription: input.metaDescription,
      readingMinutes: readingMinutes(text),
    };
  }

  async function create(body: unknown) {
    const prepared = await prepare(body);
    const publishedAt = prepared.input.status === "published" ? now() : null;
    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      let slug: string;
      if (prepared.input.slug) {
        slug = prepared.input.slug;
        if (await repo.slugTaken(slug)) throw slugTaken();
      } else {
        slug = await uniqueSlug(slugify(prepared.input.title), (candidate) => repo.slugTaken(candidate));
      }
      const result = await repo.insert(fieldsFrom(prepared, slug, publishedAt));
      if (result !== "duplicate") return adminDetail(result);
      if (prepared.input.slug) throw slugTaken();
    }
    throw new AppError(503, "SLUG_UNAVAILABLE", "A web address for this post could not be created right now. Please try again.");
  }

  async function update(id: string, body: unknown) {
    const current = await existing(id);
    const prepared = await prepare(body);
    const slug = prepared.input.slug ?? current.slug; // slug na bheja ho to purana hi rehta hai
    if (slug !== current.slug && (await repo.slugTaken(slug, current.id))) throw slugTaken();
    const publishedAt = prepared.input.status === "published" ? (current.publishedAt ?? now()) : current.publishedAt;
    const result = await repo.update(current.id, fieldsFrom(prepared, slug, publishedAt));
    if (result === "duplicate") throw slugTaken();
    if (!result) throw notFound();
    return adminDetail(result);
  }

  async function setStatus(id: string, status: unknown) {
    if (status !== "draft" && status !== "published") throw invalid('The status must be "draft" or "published".');
    const current = await existing(id);
    if (status === "published" && htmlToText(current.contentHtml) === "") throw invalid("A published post needs some content.");
    const nextStatus: PostStatus = status;
    const publishedAt = nextStatus === "published" ? (current.publishedAt ?? now()) : current.publishedAt;
    const result = await repo.setStatus(current.id, nextStatus, publishedAt);
    if (!result) throw notFound();
    return adminDetail(result);
  }

  async function remove(id: string): Promise<void> {
    if (!isObjectIdString(id) || !(await repo.remove(id))) throw notFound();
  }

  async function get(id: string) {
    return adminDetail(await existing(id));
  }

  async function list(query: unknown) {
    const parsed = parseListQuery(query, 10);
    const { items, total } = await repo.list({ ...parsed, sort: "updated" });
    return pageOf(items.map(adminSummary), total, parsed.page, parsed.pageSize);
  }

  async function stats() {
    const data = await repo.stats();
    return {
      totals: { posts: data.posts, published: data.published, drafts: data.posts - data.published, categories: data.categories, tags: data.tags },
      recent: data.recent.map(adminSummary),
    };
  }

  // Public hissa: sirf published posts, aur sirf zaroori maloomat
  async function listPublished(query: unknown) {
    const parsed = { ...parseListQuery(query, 9), status: "published" as const };
    const { items, total } = await repo.list({ ...parsed, sort: "published" });
    return pageOf(items.map(publicSummary), total, parsed.page, parsed.pageSize);
  }

  async function getPublished(slug: string) {
    if (!isValidSlug(slug)) throw notFound();
    const post = await repo.findPublishedBySlug(slug);
    if (!post) throw notFound();
    return publicDetail(post);
  }

  return { create, update, setStatus, remove, get, list, stats, listPublished, getPublished };
}

export type PostService = ReturnType<typeof createPostService>;