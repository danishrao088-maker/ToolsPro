import { asyncHandler } from "../utils/asyncHandler";

export interface PublicPostsApi {
  listPublished(query: unknown): Promise<unknown>;
  getPublished(slug: string): Promise<unknown>;
}

export interface PublicTermsApi {
  listPublic(): Promise<unknown>;
}

// Public blog: sirf published cheezein. Thori der ke liye cache ho sakti hain (admin ka kaam 1 minute me nazar aata hai).
const CACHE = "public, max-age=60";

export function createBlogHandlers(posts: PublicPostsApi, categories: PublicTermsApi, tags: PublicTermsApi) {
  const listPosts = asyncHandler(async (req, res) => {
    res.set("Cache-Control", CACHE);
    res.json({ success: true, data: await posts.listPublished(req.query) });
  });
  const getPost = asyncHandler(async (req, res) => {
    const data = await posts.getPublished(String(req.params.slug));
    res.set("Cache-Control", CACHE);
    res.json({ success: true, data });
  });
  const listCategories = asyncHandler(async (_req, res) => {
    res.set("Cache-Control", CACHE);
    res.json({ success: true, data: await categories.listPublic() });
  });
  const listTags = asyncHandler(async (_req, res) => {
    res.set("Cache-Control", CACHE);
    res.json({ success: true, data: await tags.listPublic() });
  });
  return { listPosts, getPost, listCategories, listTags };
}