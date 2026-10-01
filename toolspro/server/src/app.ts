import express from "express";
import helmet from "helmet";
import cors from "cors";
import { env } from "./config/env";
import { isDbConnected } from "./config/db";
import { notFound, errorHandler } from "./middleware/errorHandler";
import { apiRouter } from "./routes";

export const app = express();

app.use(helmet());
app.use(cors({ origin: env.CLIENT_ORIGINS }));
app.use(express.json({ limit: "10kb" }));
app.use("/api", apiRouter);

app.get("/api/health", (_req, res) => {
  res.json({
    success: true,
    data: { status: "ok", database: isDbConnected() ? "connected" : "disconnected" },
  });
});

app.use(notFound);
app.use(errorHandler);