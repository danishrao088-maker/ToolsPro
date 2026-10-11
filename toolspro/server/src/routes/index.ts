import { Router } from "express";
import { toolRouter } from "./toolRoutes";
import { categoryRouter } from "./categoryRoutes";
import { contactRouter } from "./contactRoutes";
import { webToolRouter } from "./webToolRoutes";

export const apiRouter = Router();
apiRouter.use("/tools", toolRouter);
apiRouter.use("/categories", categoryRouter);
apiRouter.use("/contact", contactRouter);
apiRouter.use("/web", webToolRouter);