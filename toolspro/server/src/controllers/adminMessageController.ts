import { asyncHandler } from "../utils/asyncHandler";

export interface AdminMessagesApi {
  list(query: unknown): Promise<unknown>;
  unreadCount(): Promise<unknown>;
  setRead(id: string, body: unknown): Promise<unknown>;
  markAllRead(): Promise<unknown>;
  remove(id: string): Promise<void>;
}

// Contact paighamat ke handlers (/api/admin/messages, login zaroori)
export function createAdminMessageHandlers(service: AdminMessagesApi) {
  const list = asyncHandler(async (req, res) => {
    res.json({ success: true, data: await service.list(req.query) });
  });
  const unreadCount = asyncHandler(async (_req, res) => {
    res.json({ success: true, data: await service.unreadCount() });
  });
  const setRead = asyncHandler(async (req, res) => {
    res.json({ success: true, data: await service.setRead(String(req.params.id), req.body) });
  });
  const markAllRead = asyncHandler(async (_req, res) => {
    res.json({ success: true, data: await service.markAllRead() });
  });
  const remove = asyncHandler(async (req, res) => {
    await service.remove(String(req.params.id));
    res.json({ success: true, data: { deleted: true } });
  });
  return { list, unreadCount, setRead, markAllRead, remove };
}
