import { Router } from "express";
import { submitContact } from "../controllers/contactController";
import { contactLimiter } from "../middleware/rateLimiters";

export const contactRouter = Router();
contactRouter.post("/", contactLimiter, submitContact);