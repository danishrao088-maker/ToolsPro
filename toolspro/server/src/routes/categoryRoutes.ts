import { Router } from "express";
import { listCategories } from "../controllers/toolController";

export const categoryRouter = Router();
categoryRouter.get("/", listCategories);