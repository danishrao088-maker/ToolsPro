import express, { type Express } from "express";
import { blogConfig } from "./config";
import { blogRouter } from "./routes";
import { installSpa } from "./spa";

// app.ts mein, API routes ke BAAD aur notFound ke PEHLE yeh ek line lagayein:
//   installBlog(app);
export function installBlog(app: Express): void {
  if (blogConfig.uploadsDir) {
    // Purane WordPress jaisa hi image URL (/wp-content/uploads/...) taake Google Images ke links na tootein
    app.use(
      "/wp-content/uploads",
      express.static(blogConfig.uploadsDir, { maxAge: "30d", immutable: true, index: false })
    );
  }
  app.use(blogRouter);
  if (blogConfig.clientDistDir) installSpa(app, blogConfig.clientDistDir);
}
