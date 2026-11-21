import { Router } from "express";
import { createAdminMessageHandlers } from "../controllers/adminMessageController";
import { messageService } from "../services/messageDefault";

const messages = createAdminMessageHandlers(messageService);

// /api/admin/messages (adminRoutes.ts me requireAdmin ke baad lagta hai)
export const adminMessageRouter = Router();

adminMessageRouter.get("/messages", messages.list);
adminMessageRouter.get("/messages/unread-count", messages.unreadCount);
adminMessageRouter.post("/messages/read-all", messages.markAllRead);
adminMessageRouter.patch("/messages/:id", messages.setRead);
adminMessageRouter.delete("/messages/:id", messages.remove);
