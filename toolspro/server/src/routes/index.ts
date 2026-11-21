import { Router } from "express";
import { toolRouter } from "./toolRoutes";
import { categoryRouter } from "./categoryRoutes";
import { contactRouter } from "./contactRoutes";
import { webToolRouter } from "./webToolRoutes";
import { convertRouter } from "./convertRoutes";
import { shortApiRouter } from "./shortUrlRoutes";
import { adminRouter } from "./adminRoutes";
import { blogRouter } from "./blogRoutes";

export const apiRouter = Router();
apiRouter.use("/tools", toolRouter);
apiRouter.use("/categories", categoryRouter);
apiRouter.use("/contact", contactRouter);
apiRouter.use("/web", webToolRouter);
apiRouter.use("/convert", convertRouter);
apiRouter.use("/short", shortApiRouter);
apiRouter.use("/admin", adminRouter);
apiRouter.use("/blog", blogRouter);