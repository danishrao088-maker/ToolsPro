import { asyncHandler } from "../utils/asyncHandler";

export interface AdminPostsApi {
  list(query: unknown): Promise<unknown>;
  get(id: string): Promise<unknown>;
  create(body: unknown): Promise<unknown>;
  update(id: string, body: unknown): Promise<unknown>;
  setStatus(id: string, status: unknown): Promise<unknown>;
  remove(id: string): Promise<void>;
  stats(): Promise<unknown>;
}

export interface AdminTermsApi {
  list(): Promise<unknown>;
  create(body: unknown): Promise<unknown>;
  update(id: string, body: unknown): Promise<unknown>;
  remove(id: string): Promise<void>;
}

// Admin ke posts, categories, tags aur stats ke handlers. Sab /api/admin/... ke neeche hain (login zaroori).
export function createAdminPostHandlers(service: AdminPostsApi) {
  const listPosts = asyncHandler(async (req, res) => {
    res.json({ success: true, data: await service.list(req.query) });
  });
  const getPost = asyncHandler(async (req, res) => {
    res.json({ success: true, data: await service.get(String(req.params.id)) });
  });
  const createPost = asyncHandler(async (req, res) => {
    res.status(201).json({ success: true, data: await service.create(req.body) });
  });
  const updatePost = asyncHandler(async (req, res) => {
    res.json({ success: true, data: await service.update(String(req.params.id), req.body) });
  });
  const setPostStatus = asyncHandler(async (req, res) => {
    const body = req.body as { status?: unknown } | null | undefined;
    res.json({ success: true, data: await service.setStatus(String(req.params.id), body?.status) });
  });
  const deletePost = asyncHandler(async (req, res) => {
    await service.remove(String(req.params.id));
    res.json({ success: true, data: { deleted: true } });
  });
  const stats = asyncHandler(async (_req, res) => {
    res.json({ success: true, data: await service.stats() });
  });
  return { listPosts, getPost, createPost, updatePost, setPostStatus, deletePost, stats };
}

export function createAdminTermHandlers(service: AdminTermsApi) {
  const list = asyncHandler(async (_req, res) => {
    res.json({ success: true, data: await service.list() });
  });
  const create = asyncHandler(async (req, res) => {
    res.status(201).json({ success: true, data: await service.create(req.body) });
  });
  const update = asyncHandler(async (req, res) => {
    res.json({ success: true, data: await service.update(String(req.params.id), req.body) });
  });
  const remove = asyncHandler(async (req, res) => {
    await service.remove(String(req.params.id));
    res.json({ success: true, data: { deleted: true } });
  });
  return { list, create, update, remove };
}