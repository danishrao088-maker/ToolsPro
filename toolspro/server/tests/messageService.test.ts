import { describe, expect, it } from "vitest";
import { createMessageService, parseMessageQuery, type MessageRecord, type MessageRepo } from "../src/services/messageService";

const id = (n: number) => `65c00000000000000000000${n}`;
const record = (n: number, extra: Partial<MessageRecord> = {}): MessageRecord => ({
  id: id(n),
  name: `Person ${n}`,
  email: `p${n}@example.com`,
  subject: `Subject ${n}`,
  message: `Message body ${n}`,
  createdAt: new Date(Date.UTC(2026, 10, n)),
  read: false,
  ...extra,
});

// Memory me chalne wali jhooti repo: asli repo jaisa hi hisaab (naya pehle, unread filter, ginti)
function setup(initial: MessageRecord[]) {
  const rows = [...initial];
  const lastList: { unreadOnly: boolean; skip: number; limit: number }[] = [];
  const repo: MessageRepo = {
    async list(query) {
      lastList.push(query);
      const matching = rows.filter((row) => !query.unreadOnly || !row.read).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      return { items: matching.slice(query.skip, query.skip + query.limit), total: matching.length };
    },
    async countUnread() {
      return rows.filter((row) => !row.read).length;
    },
    async setRead(messageId, read) {
      const found = rows.find((row) => row.id === messageId);
      if (!found) return null;
      found.read = read;
      return { ...found };
    },
    async markAllRead() {
      const unread = rows.filter((row) => !row.read);
      unread.forEach((row) => (row.read = true));
      return unread.length;
    },
    async remove(messageId) {
      const index = rows.findIndex((row) => row.id === messageId);
      if (index < 0) return false;
      rows.splice(index, 1);
      return true;
    },
  };
  return { rows, lastList, service: createMessageService({ repo }) };
}

describe("parseMessageQuery", () => {
  it("uses safe defaults and caps the page size", () => {
    expect(parseMessageQuery({})).toEqual({ page: 1, pageSize: 20, unreadOnly: false });
    expect(parseMessageQuery(undefined)).toEqual({ page: 1, pageSize: 20, unreadOnly: false });
    expect(parseMessageQuery({ page: "3", pageSize: "500", status: "unread" })).toEqual({ page: 3, pageSize: 50, unreadOnly: true });
  });
  it("ignores nonsense", () => {
    expect(parseMessageQuery({ page: "-2", pageSize: "abc", status: "other" })).toEqual({ page: 1, pageSize: 20, unreadOnly: false });
    expect(parseMessageQuery({ page: ["2"], pageSize: "1.5" })).toEqual({ page: 1, pageSize: 20, unreadOnly: false });
  });
});

describe("list", () => {
  it("shows the newest message first with the paging details and the unread count", async () => {
    const { service } = setup([record(1), record(2, { read: true }), record(3)]);
    const page = await service.list({});
    expect(page.items.map((m) => m.id)).toEqual([id(3), id(2), id(1)]);
    expect(page).toMatchObject({ page: 1, pageSize: 20, total: 3, totalPages: 1, unread: 2 });
    expect(page.items[0]).toEqual({
      id: id(3),
      name: "Person 3",
      email: "p3@example.com",
      subject: "Subject 3",
      message: "Message body 3",
      createdAt: "2026-11-03T00:00:00.000Z",
      read: false,
    });
  });
  it("can show only the unread ones", async () => {
    const { service } = setup([record(1), record(2, { read: true }), record(3)]);
    const page = await service.list({ status: "unread" });
    expect(page.items.map((m) => m.id)).toEqual([id(3), id(1)]);
    expect(page.total).toBe(2);
  });
  it("pages through the list", async () => {
    const { service, lastList } = setup([record(1), record(2), record(3)]);
    const page = await service.list({ page: "2", pageSize: "2" });
    expect(page.items.map((m) => m.id)).toEqual([id(1)]);
    expect(page).toMatchObject({ page: 2, pageSize: 2, total: 3, totalPages: 2 });
    expect(lastList[0]).toEqual({ unreadOnly: false, skip: 2, limit: 2 });
  });
  it("answers with an empty list when there are no messages", async () => {
    const { service } = setup([]);
    expect(await service.list({})).toMatchObject({ items: [], total: 0, totalPages: 1, unread: 0 });
  });
});

describe("unreadCount", () => {
  it("counts only the unread messages", async () => {
    const { service } = setup([record(1), record(2, { read: true }), record(3)]);
    expect(await service.unreadCount()).toEqual({ unread: 2 });
  });
});

describe("setRead", () => {
  it("marks a message read and unread again", async () => {
    const { service, rows } = setup([record(1)]);
    expect(await service.setRead(id(1), { read: true })).toMatchObject({ id: id(1), read: true });
    expect(rows[0].read).toBe(true);
    expect(await service.setRead(id(1), { read: false })).toMatchObject({ read: false });
  });
  it("refuses a body that is not true or false", async () => {
    const { service } = setup([record(1)]);
    for (const body of [undefined, null, {}, { read: "yes" }, { read: 1 }]) {
      await expect(service.setRead(id(1), body)).rejects.toMatchObject({ code: "VALIDATION_ERROR", statusCode: 400 });
    }
  });
  it("answers 404 for an unknown or malformed id", async () => {
    const { service } = setup([record(1)]);
    await expect(service.setRead(id(9), { read: true })).rejects.toMatchObject({ code: "NOT_FOUND", statusCode: 404 });
    await expect(service.setRead("not-an-id", { read: true })).rejects.toMatchObject({ code: "NOT_FOUND", statusCode: 404 });
  });
});

describe("markAllRead", () => {
  it("marks everything read and says how many changed", async () => {
    const { service, rows } = setup([record(1), record(2, { read: true }), record(3)]);
    expect(await service.markAllRead()).toEqual({ updated: 2 });
    expect(rows.every((row) => row.read)).toBe(true);
    expect(await service.markAllRead()).toEqual({ updated: 0 });
  });
});

describe("remove", () => {
  it("deletes one message and leaves the rest", async () => {
    const { service, rows } = setup([record(1), record(2)]);
    await service.remove(id(1));
    expect(rows.map((row) => row.id)).toEqual([id(2)]);
  });
  it("answers 404 for an unknown or malformed id", async () => {
    const { service } = setup([record(1)]);
    await expect(service.remove(id(9))).rejects.toMatchObject({ code: "NOT_FOUND", statusCode: 404 });
    await expect(service.remove("../etc")).rejects.toMatchObject({ code: "NOT_FOUND", statusCode: 404 });
  });
});
