import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import { blogConfig } from "../blog/config";
import { createAdminPostHandlers, createAdminTermHandlers } from "../controllers/adminBlogController";
import { createUploadHandler, uploadBody } from "../controllers/adminUploadController";
import { categoryService, postService, tagService } from "../services/blogDefault";
import { createUploadService } from "../services/uploadService";
import { AppError } from "../utils/AppError";

// /api/admin ke neeche (adminRoutes.ts me requireAdmin ke baad lagta hai, yahan har route login ke peeche hai)
const posts = createAdminPostHandlers(postService);
const categories = createAdminTermHandlers(categoryService);
const tags = createAdminTermHandlers(tagService);
const upload = createUploadHandler(createUploadService({ dir: blogConfig.uploadsDir }));

// Ek IP se ek ghante mein 120 images tak
const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 120,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, _res, next) => next(new AppError(429, "RATE_LIMITED", "Too many uploads. Please try again later.")),
});

export const adminBlogRouter = Router();

adminBlogRouter.get("/stats", posts.stats);

adminBlogRouter.get("/posts", posts.listPosts);
adminBlogRouter.post("/posts", posts.createPost);
adminBlogRouter.get("/posts/:id", posts.getPost);
adminBlogRouter.put("/posts/:id", posts.updatePost);
adminBlogRouter.patch("/posts/:id/status", posts.setPostStatus);
adminBlogRouter.delete("/posts/:id", posts.deletePost);

adminBlogRouter.post("/uploads", uploadLimiter, uploadBody, upload);

adminBlogRouter.get("/categories", categories.list);
adminBlogRouter.post("/categories", categories.create);
adminBlogRouter.put("/categories/:id", categories.update);
adminBlogRouter.delete("/categories/:id", categories.remove);

adminBlogRouter.get("/tags", tags.list);
adminBlogRouter.post("/tags", tags.create);
adminBlogRouter.put("/tags/:id", tags.update);
adminBlogRouter.delete("/tags/:id", tags.remove);