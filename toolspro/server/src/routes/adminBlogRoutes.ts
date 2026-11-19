import { Router } from "express";
import { createAdminPostHandlers, createAdminTermHandlers } from "../controllers/adminBlogController";
import { categoryService, postService, tagService } from "../services/blogDefault";

// /api/admin ke neeche (adminRoutes.ts me requireAdmin ke baad lagta hai, yahan har route login ke peeche hai)
const posts = createAdminPostHandlers(postService);
const categories = createAdminTermHandlers(categoryService);
const tags = createAdminTermHandlers(tagService);

export const adminBlogRouter = Router();

adminBlogRouter.get("/stats", posts.stats);

adminBlogRouter.get("/posts", posts.listPosts);
adminBlogRouter.post("/posts", posts.createPost);
adminBlogRouter.get("/posts/:id", posts.getPost);
adminBlogRouter.put("/posts/:id", posts.updatePost);
adminBlogRouter.patch("/posts/:id/status", posts.setPostStatus);
adminBlogRouter.delete("/posts/:id", posts.deletePost);

adminBlogRouter.get("/categories", categories.list);
adminBlogRouter.post("/categories", categories.create);
adminBlogRouter.put("/categories/:id", categories.update);
adminBlogRouter.delete("/categories/:id", categories.remove);

adminBlogRouter.get("/tags", tags.list);
adminBlogRouter.post("/tags", tags.create);
adminBlogRouter.put("/tags/:id", tags.update);
adminBlogRouter.delete("/tags/:id", tags.remove);