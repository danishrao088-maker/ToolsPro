import express from "express";
import helmet from "helmet";
import cors from "cors";
import { env } from "./config/env";
import { isDbConnected } from "./config/db";
import { notFound, errorHandler } from "./middleware/errorHandler";
import { apiRouter } from "./routes";
import { shortRedirectRouter } from "./routes/shortUrlRoutes";
import { installBlog } from "./blog";

export const app = express();
if (env.NODE_ENV === "production") app.set("trust proxy", 1);
app.use(helmet());
app.use(cors({ origin: env.CLIENT_ORIGINS, credentials: true }));

// Aam requests ki body 10kb tak; sirf admin ke posts (jin me lamba article hota hai) ke liye 1mb tak
const smallJson = express.json({ limit: "10kb" });
const postJson = express.json({ limit: "1mb" });
app.use((req, res, next) => (/^\/api\/admin\/posts(\/|$)/.test(req.path) ? postJson(req, res, next) : smallJson(req, res, next)));

app.use("/api", apiRouter);

app.get("/api/health", (_req, res) => {
  res.json({
    success: true,
    data: { status: "ok", database: isDbConnected() ? "connected" : "disconnected" },
  });
});

app.use("/s", shortRedirectRouter);

// WordPress se aaya blog: /blog/, /<slug>/, /category/..., sitemap.xml, rss.xml, images (blog/index.ts dekhein)
installBlog(app);

app.use(notFound);
app.use(errorHandler);