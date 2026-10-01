import { Router } from "express";
import { listTools } from "../controllers/toolController";

export const toolRouter = Router();
toolRouter.get("/", listTools);