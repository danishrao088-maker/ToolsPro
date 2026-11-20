import { AppError } from "../utils/AppError";
import { isObjectIdString } from "./blogText";
import { pageOf } from "./blogView";

// Contact form se aaye paighamat ko admin mein dikhane ka hissa. Database wala kaam repo karti hai (messageRepo.ts).

export interface MessageRecord {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  createdAt: Date;
  read: boolean;
}

export interface MessageRepo {
  list(query: { unreadOnly: boolean; skip: number; limit: number }): Promise<{ items: MessageRecord[]; total: number }>;
  countUnread(): Promise<number>;
  setRead(id: string, read: boolean): Promise<MessageRecord | null>;
  markAllRead(): Promise<number>;
  remove(id: string): Promise<boolean>;
}

export interface AdminMessage {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  createdAt: string;
  read: boolean;
}

const view = (record: MessageRecord): AdminMessage => ({
  id: record.id,
  name: record.name,
  email: record.email,
  subject: record.subject,
  message: record.message,
  createdAt: record.createdAt.toISOString(),
  read: record.read,
});

export interface MessageListQuery {
  page: number;
  pageSize: number;
  unreadOnly: boolean;
}

export function parseMessageQuery(raw: unknown): MessageListQuery {
  const data = typeof raw === "object" && raw !== null ? (raw as Record<string, unknown>) : {};
  const number = (key: string, fallback: number, max: number): number => {
    const value = Number(typeof data[key] === "string" ? data[key] : NaN);
    return Number.isInteger(value) && value >= 1 ? Math.min(value, max) : fallback;
  };
  return { page: number("page", 1, 100_000), pageSize: number("pageSize", 20, 50), unreadOnly: data.status === "unread" };
}

export function createMessageService(deps: { repo: MessageRepo }) {
  const { repo } = deps;
  const notFound = () => new AppError(404, "NOT_FOUND", "That message was not found.");

  async function list(query: unknown) {
    const parsed = parseMessageQuery(query);
    const [{ items, total }, unread] = await Promise.all([
      repo.list({ unreadOnly: parsed.unreadOnly, skip: (parsed.page - 1) * parsed.pageSize, limit: parsed.pageSize }),
      repo.countUnread(),
    ]);
    return { ...pageOf(items.map(view), total, parsed.page, parsed.pageSize), unread };
  }

  async function unreadCount() {
    return { unread: await repo.countUnread() };
  }

  async function setRead(id: string, body: unknown) {
    if (!isObjectIdString(id)) throw notFound();
    const read = typeof body === "object" && body !== null ? (body as { read?: unknown }).read : undefined;
    if (typeof read !== "boolean") throw new AppError(400, "VALIDATION_ERROR", "Send read as true or false.");
    const updated = await repo.setRead(id, read);
    if (!updated) throw notFound();
    return view(updated);
  }

  async function markAllRead() {
    return { updated: await repo.markAllRead() };
  }

  async function remove(id: string): Promise<void> {
    if (!isObjectIdString(id) || !(await repo.remove(id))) throw notFound();
  }

  return { list, unreadCount, setRead, markAllRead, remove };
}

export type MessageService = ReturnType<typeof createMessageService>;
