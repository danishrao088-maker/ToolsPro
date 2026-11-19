import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import { createBlogHandlers } from "../controllers/blogController";
import { categoryService, postService, tagService } from "../services/blogDefault";
import { AppError } from "../utils/AppError";

// Public blog padhne par ek IP se minute me 120 requests
const readLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 120,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, _res, next) => next(new AppError(429, "RATE_LIMITED", "Too many requests. Please slow down.")),
});

const { listPosts, getPost, listCategories, listTags } = createBlogHandlers(postService, categoryService, tagService);

export const blogRouter = Router(); // /api/blog
blogRouter.use(readLimiter);
blogRouter.get("/posts", listPosts);
blogRouter.get("/posts/:slug", getPost);
blogRouter.get("/categories", listCategories);
blogRouter.get("/tags", listTags);