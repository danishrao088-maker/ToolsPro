import express, { type Express } from "express";
import path from "node:path";

// Production mein Express hi React app (client/dist) bhi deta hai, taake blog ke slugs aur React routes
// ek hi server se chalein. Ye sirf tab lagta hai jab CLIENT_DIST_DIR set ho.
//
// ZAROORI: Agar React app mein naya route (page) jodein to yahan bhi usko list mein jod dein,
// warna wo URL 404 status ke saath dikhega (page phir bhi khulta hai, lekin Google ko 404 milta hai).
const SPA_ROUTES: RegExp[] = [
  /^\/$/,
  /^\/tools\/?$/,
  /^\/tools\/[^/]+\/?$/,
  /^\/categories\/?$/,
  /^\/category\/[^/]+\/?$/,
  /^\/about\/?$/,
  /^\/contact\/?$/,
  /^\/privacy\/?$/,
  /^\/terms\/?$/,
];

export function isSpaRoute(urlPath: string): boolean {
  return SPA_ROUTES.some((r) => r.test(urlPath));
}

export function installSpa(app: Express, distDir: string): void {
  // Vite ke hashed files (assets/*.js, *.css) hamesha ke liye cache ho sakte hain
  app.use("/assets", express.static(path.join(distDir, "assets"), { maxAge: "1y", immutable: true }));
  app.use(express.static(distDir, { index: false, maxAge: "1h" }));

  app.use((req, res, next) => {
    if (req.method !== "GET" && req.method !== "HEAD") return next();
    if (req.path === "/api" || req.path.startsWith("/api/") || req.path.startsWith("/s/")) return next();
    // Missing file (image, js, css, wp-content...) par HTML nahi, seedha chhota 404 dete hain
    if (path.extname(req.path) || req.path.startsWith("/wp-")) {
      res.status(404).type("text/plain").send("Not found");
      return;
    }
    // Unknown URL par bhi index.html dete hain (React ka NotFound page dikhe), lekin status 404 ke saath
    res.status(isSpaRoute(req.path) ? 200 : 404).sendFile(path.join(distDir, "index.html"));
  });
}
