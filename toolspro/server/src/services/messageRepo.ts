import { Types } from "mongoose";
import { isDbConnected } from "../config/db";
import { ContactMessage } from "../models/ContactMessage";
import { AppError } from "../utils/AppError";
import type { MessageRecord, MessageRepo } from "./messageService";

interface RawMessage {
  _id: Types.ObjectId;
  name: string;
  email: string;
  subject: string;
  message: string;
  createdAt: Date;
  read?: boolean;
}

function ensureDb(): void {
  if (!isDbConnected()) {
    throw new AppError(503, "DB_UNAVAILABLE", "Messages are not available right now. Please try again later.");
  }
}

const toRecord = (raw: RawMessage): MessageRecord => ({
  id: String(raw._id),
  name: raw.name,
  email: raw.email,
  subject: raw.subject,
  message: raw.message,
  createdAt: raw.createdAt,
  read: raw.read === true, // purane messages mein field nahi hota => unread
});

const UNREAD = { read: { $ne: true } };

export function createMongoMessageRepo(): MessageRepo {
  return {
    async list({ unreadOnly, skip, limit }) {
      ensureDb();
      const filter = unreadOnly ? UNREAD : {};
      const [raw, total] = await Promise.all([
        ContactMessage.find(filter).sort({ createdAt: -1, _id: -1 }).skip(skip).limit(limit).lean(),
        ContactMessage.countDocuments(filter),
      ]);
      return { items: (raw as unknown as RawMessage[]).map(toRecord), total };
    },

    async countUnread() {
      ensureDb();
      return ContactMessage.countDocuments(UNREAD);
    },

    async setRead(id, read) {
      ensureDb();
      const found = (await ContactMessage.findByIdAndUpdate(id, { $set: { read } }, { new: true }).lean()) as unknown as RawMessage | null;
      return found ? toRecord(found) : null;
    },

    async markAllRead() {
      ensureDb();
      const result = await ContactMessage.updateMany(UNREAD, { $set: { read: true } });
      return result.modifiedCount;
    },

    async remove(id) {
      ensureDb();
      return (await ContactMessage.findByIdAndDelete(id).lean()) !== null;
    },
  };
}
