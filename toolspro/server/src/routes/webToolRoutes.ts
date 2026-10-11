import { Router } from "express";
import {
  analyzeMeta,
  analyzeOpenGraph,
  checkDown,
  checkRedirects,
  checkStatus,
  pingSite,
  seoScore,
  snoopPage,
} from "../controllers/webToolController";
import { pingLimiter, webToolLimiter } from "../middleware/rateLimiters";

export const webToolRouter = Router();
webToolRouter.post("/status", webToolLimiter, checkStatus);
webToolRouter.post("/redirects", webToolLimiter, checkRedirects);
webToolRouter.post("/is-it-down", webToolLimiter, checkDown);
webToolRouter.post("/ping", pingLimiter, pingSite);
webToolRouter.post("/meta", webToolLimiter, analyzeMeta);
webToolRouter.post("/open-graph", webToolLimiter, analyzeOpenGraph);
webToolRouter.post("/snoop", webToolLimiter, snoopPage);
webToolRouter.post("/seo-score", webToolLimiter, seoScore);
