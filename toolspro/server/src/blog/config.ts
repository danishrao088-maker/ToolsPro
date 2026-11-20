// Blog ki settings. Sab optional hain, .env mein dene par badal jati hain.
//
//   SITE_URL         Site ka asal address, jaise https://thesourcefull.com (canonical aur sitemap ke liye)
//   SITE_NAME        Site ka naam, jaise Thesource Full
//   UPLOADS_DIR      WordPress ke wp-content/uploads folder ka path (images /wp-content/uploads se milengi)
//   CLIENT_DIST_DIR  React ke build (client/dist) ka path. Set ho to Express hi React app bhi deta hai.

import path from "node:path";

function resolveDir(value: string | undefined): string {
  return value && value.trim() ? path.resolve(value.trim()) : "";
}

export const blogConfig = {
  siteUrl: (process.env.SITE_URL ?? "http://localhost:5000").replace(/\/+$/, ""),
  siteName: process.env.SITE_NAME?.trim() || "Thesource Full",
  uploadsDir: resolveDir(process.env.UPLOADS_DIR),
  clientDistDir: resolveDir(process.env.CLIENT_DIST_DIR),
  postsPerPage: 12,
};
