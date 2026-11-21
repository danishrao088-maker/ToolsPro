import { Router, type NextFunction, type Request, type Response } from "express";
import helmet from "helmet";
import {
  blogAvailable,
  getAuthorName,
  getBySlug,
  getRelated,
  getSitemapData,
  getTerm,
  latestForFeed,
  listPosts,
} from "./blogService";
import { blogConfig } from "./config";
import { LEGACY_REDIRECTS, RESERVED_SLUGS } from "./reserved";
import { renderListing, renderPost } from "./render";
import { buildRss, buildSitemap } from "./sitemap";

export const blogRouter = Router();

// Blog pages mein purani posts ki external images aur YouTube embeds hain, isliye in pages par CSP thori narm hai.
// Ye sirf blog HTML par lagti hai, React app ki CSP (app.ts ki helmet) waisi hi rehti hai.
const blogCsp = helmet.contentSecurityPolicy({
  useDefaults: true,
  directives: {
    "img-src": ["'self'", "data:", "https:"],
    "frame-src": ["'self'", "https:"],
  },
});

function sendHtml(req: Request, res: Response, html: string): void {
  blogCsp(req, res, () => undefined); // sync hai, bas header set karta hai
  res.set("Cache-Control", "public, max-age=300");
  res.type("html").send(html);
}

function sendXml(res: Response, xml: string, type: string): void {
  res.set("Cache-Control", "public, max-age=900");
  res.type(type).send(xml);
}

// /blog -> /blog/ (purane WordPress URLs mein trailing slash tha, duplicate URLs se bachne ke liye)
function redirectToSlash(req: Request, res: Response): boolean {
  if (req.path.endsWith("/")) return false;
  const query = req.originalUrl.slice(req.path.length);
  res.redirect(301, `${req.path}/${query.startsWith("?") ? query : ""}`);
  return true;
}

function pageParam(req: Request): string | undefined {
  const v = req.params.page;
  return Array.isArray(v) ? v[0] : v;
}

// undefined = page nahi diya (1 maano), null = galat page number
function parsePage(raw: string | undefined): number | undefined | null {
  if (raw === undefined) return undefined;
  if (!/^\d{1,6}$/.test(raw)) return null;
  const n = Number(raw);
  return n >= 1 ? n : null;
}

// Agar DB connected nahi to blog chup-chap skip hota hai (React app aur API chalte rehte hain)
blogRouter.use((_req, _res, next) => (blogAvailable() ? next() : next("router")));

// ---- Blog ka main listing ----
blogRouter.get(["/blog", "/blog/page/:page"], async (req, res, next) => {
  const page = parsePage(pageParam(req));
  if (page === null) return next();
  if (redirectToSlash(req, res)) return;
  if (page === 1) return res.redirect(301, "/blog/");

  const listing = await listPosts({ kind: "all" }, page ?? 1, blogConfig.postsPerPage);
  if (listing.items.length === 0 && listing.page > 1) return next();
  sendHtml(
    req,
    res,
    renderListing({
      heading: "Blog",
      intro: `Latest articles from ${blogConfig.siteName}.`,
      basePath: "/blog/",
      ...listing,
    })
  );
});

// Purana WordPress home pagination: /page/2/ -> /blog/page/2/
blogRouter.get("/page/:page", (req, res, next) => {
  const page = parsePage(pageParam(req));
  if (page == null) return next();
  res.redirect(301, `/blog/page/${page}/`);
});

// ---- Category, tag, author archives ----
function archiveRoute(kind: "category" | "tag" | "author") {
  const prefix = `/${kind}`;
  return async (req: Request, res: Response, next: NextFunction) => {
    const slug = String(req.params.slug);
    const page = parsePage(pageParam(req));
    if (page === null) return next();
    if (redirectToSlash(req, res)) return;

    const base = `${prefix}/${encodeURI(slug)}/`;
    if (page === 1) return res.redirect(301, base);

    let heading: string | null;
    if (kind === "author") heading = await getAuthorName(slug);
    else heading = (await getTerm(kind, slug))?.name ?? null;
    if (!heading) return next(); // jaise ToolsPro ki apni /category/:slug page

    const listing = await listPosts({ kind, value: slug }, page ?? 1, blogConfig.postsPerPage);
    if (listing.items.length === 0) return next();

    sendHtml(
      req,
      res,
      renderListing({
        heading: kind === "tag" ? `Tag: ${heading}` : kind === "author" ? `Articles by ${heading}` : heading,
        basePath: base,
        noindex: kind !== "category", // tag/author archives patli hoti hain, index nahi karate
        ...listing,
      })
    );
  };
}
for (const kind of ["category", "tag", "author"] as const) {
  blogRouter.get([`/${kind}/:slug`, `/${kind}/:slug/page/:page`], archiveRoute(kind));
}

// ---- Sitemap aur RSS ----
blogRouter.get("/sitemap.xml", async (_req, res) => {
  sendXml(res, buildSitemap(await getSitemapData()), "application/xml");
});

blogRouter.get(["/rss.xml", "/feed", "/feed/"], async (_req, res) => {
  sendXml(res, buildRss(await latestForFeed(20)), "application/rss+xml");
});

// ---- Single post / page: /some-slug/ (purane WordPress jaisa URL) ----
blogRouter.get("/:slug", async (req, res, next) => {
  const slug = String(req.params.slug);
  if (slug.includes(".") || RESERVED_SLUGS.has(slug)) return next();

  const legacy = LEGACY_REDIRECTS[slug];
  if (legacy) return res.redirect(301, legacy);

  const post = await getBySlug(slug);
  if (!post) return next();
  if (redirectToSlash(req, res)) return;

  const related = post.type === "post" ? await getRelated(post, 3) : [];
  sendHtml(req, res, renderPost(post, related));
});
