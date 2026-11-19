import type { PostCard, PostView } from "./types";
import { blogConfig } from "./config";
import { escapeHtml, expandSeoTemplate } from "./content";

// Blog ke server-rendered HTML pages. Google ko poora HTML milta hai, React ki zaroorat nahi.

const CSS = `
:root{--ink:#1f2328;--muted:#656d76;--line:#e5e7eb;--brand:#2333e0;--bg:#fff;--soft:#f6f8fa}
*{box-sizing:border-box}
body{margin:0;font:17px/1.7 system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif;color:var(--ink);background:var(--bg)}
a{color:var(--brand)}
img{max-width:100%;height:auto}
.wrap{max-width:1100px;margin:0 auto;padding:0 20px}
.narrow{max-width:760px}
header.site{border-bottom:1px solid var(--line)}
header.site .wrap{display:flex;gap:24px;align-items:center;min-height:60px}
header.site .brand{font-weight:700;font-size:20px;text-decoration:none}
header.site nav a{margin-right:18px;text-decoration:none;color:var(--ink)}
main{padding:32px 0 48px}
h1{font-size:2rem;line-height:1.25;margin:.2em 0 .4em}
.crumbs,.meta{color:var(--muted);font-size:.9rem}
.crumbs a,.meta a{color:inherit}
.featured{display:block;margin:20px 0;border-radius:8px}
.content{overflow-wrap:anywhere}
.content h2,.content h3{line-height:1.3;margin-top:1.8em}
.content table{display:block;overflow:auto;border-collapse:collapse}
.content td,.content th{border:1px solid var(--line);padding:6px 10px}
.content blockquote{margin:1em 0;padding:.2em 1em;border-left:4px solid var(--line);color:var(--muted)}
.content iframe{max-width:100%}
.aligncenter{display:block;margin:1em auto}.alignleft{float:left;margin:0 1em 1em 0}.alignright{float:right;margin:0 0 1em 1em}
.tags a{display:inline-block;margin:0 6px 6px 0;padding:2px 10px;border:1px solid var(--line);border-radius:999px;font-size:.85rem;text-decoration:none}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:24px}
.card{border:1px solid var(--line);border-radius:10px;overflow:hidden;background:var(--bg)}
.card .thumb{display:block;background:var(--soft);aspect-ratio:16/9}
.card .thumb img{width:100%;height:100%;object-fit:cover;display:block}
.card-body{padding:14px 16px 16px}
.card .cat{font-size:.75rem;text-transform:uppercase;letter-spacing:.04em;color:var(--brand)}
.card h2{font-size:1.1rem;line-height:1.35;margin:.3em 0}
.card h2 a{color:var(--ink);text-decoration:none}
.card p{margin:.4em 0;color:var(--muted);font-size:.95rem;line-height:1.5}
.pager{display:flex;gap:8px;flex-wrap:wrap;margin:32px 0 0}
.pager a,.pager span{padding:6px 12px;border:1px solid var(--line);border-radius:6px;text-decoration:none}
.pager .cur{background:var(--brand);border-color:var(--brand);color:#fff}
.related{margin-top:48px}
footer.site{border-top:1px solid var(--line);color:var(--muted);font-size:.9rem;padding:24px 0}
footer.site a{margin-right:14px;color:inherit}
@media(max-width:600px){h1{font-size:1.6rem}body{font-size:16px}}
`;

interface LayoutArgs {
  title: string;
  description: string;
  canonical: string;
  robots?: string;
  ogType?: "website" | "article";
  ogImage?: string;
  jsonLd?: object[];
  prevUrl?: string;
  nextUrl?: string;
  body: string;
}

const dateFormat = new Intl.DateTimeFormat("en-US", { dateStyle: "long", timeZone: "UTC" });

export function formatDate(d: Date | string): string {
  return dateFormat.format(new Date(d));
}

export function absoluteUrl(path: string): string {
  return path.startsWith("http") ? path : `${blogConfig.siteUrl}${path}`;
}

function jsonLdScript(data: object): string {
  const json = JSON.stringify(data).replace(/</g, "\\u003c");
  return `<script type="application/ld+json">${json}</script>`;
}

export function layout(a: LayoutArgs): string {
  const name = escapeHtml(blogConfig.siteName);
  const og = [
    ["og:site_name", blogConfig.siteName],
    ["og:type", a.ogType ?? "website"],
    ["og:title", a.title],
    ["og:description", a.description],
    ["og:url", a.canonical],
    ...(a.ogImage ? [["og:image", a.ogImage]] : []),
  ]
    .map(([p, c]) => `<meta property="${p}" content="${escapeHtml(c)}">`)
    .join("\n");

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(a.title)}</title>
<meta name="description" content="${escapeHtml(a.description)}">
<meta name="robots" content="${a.robots ?? "index,follow,max-image-preview:large"}">
<link rel="canonical" href="${escapeHtml(a.canonical)}">
${a.prevUrl ? `<link rel="prev" href="${escapeHtml(a.prevUrl)}">` : ""}
${a.nextUrl ? `<link rel="next" href="${escapeHtml(a.nextUrl)}">` : ""}
<link rel="alternate" type="application/rss+xml" title="${name}" href="${escapeHtml(absoluteUrl("/rss.xml"))}">
${og}
<meta name="twitter:card" content="${a.ogImage ? "summary_large_image" : "summary"}">
${(a.jsonLd ?? []).map(jsonLdScript).join("\n")}
<style>${CSS}</style>
</head>
<body>
<header class="site"><div class="wrap">
<a class="brand" href="/">${name}</a>
<nav><a href="/tools">Tools</a><a href="/blog/">Blog</a></nav>
</div></header>
<main><div class="wrap">
${a.body}
</div></main>
<footer class="site"><div class="wrap">
<a href="/about">About</a><a href="/contact">Contact</a><a href="/privacy">Privacy</a><a href="/terms">Terms</a>
<div>&copy; ${new Date().getUTCFullYear()} ${name}</div>
</div></footer>
</body>
</html>`;
}

function seoTitle(post: PostView | PostCard): string {
  const siteName = blogConfig.siteName;
  const category = post.categories[0]?.name;
  if (post.seo?.title) {
    const t = expandSeoTemplate(post.seo.title, { title: post.title, siteName, category });
    if (t) return t;
  }
  return `${post.title} | ${siteName}`;
}

function seoDescription(post: PostView | PostCard): string {
  if (post.seo?.description) {
    const d = expandSeoTemplate(post.seo.description, {
      title: post.title,
      siteName: blogConfig.siteName,
      excerpt: post.excerpt,
    });
    if (d) return d;
  }
  return post.excerpt;
}

function card(p: PostCard): string {
  const img = p.featuredImage;
  const src = img?.cardPath ?? img?.path;
  const w = img?.cardPath ? img.cardWidth : img?.width;
  const h = img?.cardPath ? img.cardHeight : img?.height;
  const cat = p.categories[0];
  return `<article class="card">
${
  src
    ? `<a class="thumb" href="/${encodeURI(p.slug)}/" tabindex="-1" aria-hidden="true"><img loading="lazy" decoding="async" src="${escapeHtml(src)}" alt="${escapeHtml(img?.alt || p.title)}"${w && h ? ` width="${w}" height="${h}"` : ""}></a>`
    : `<a class="thumb" href="/${encodeURI(p.slug)}/" tabindex="-1" aria-hidden="true"></a>`
}
<div class="card-body">
${cat ? `<div class="cat">${escapeHtml(cat.name)}</div>` : ""}
<h2><a href="/${encodeURI(p.slug)}/">${escapeHtml(p.title)}</a></h2>
<p>${escapeHtml(p.excerpt)}</p>
<div class="meta"><time datetime="${new Date(p.publishedAt).toISOString()}">${formatDate(p.publishedAt)}</time></div>
</div>
</article>`;
}

function pager(basePath: string, page: number, totalPages: number): string {
  if (totalPages <= 1) return "";
  const href = (n: number) => (n === 1 ? basePath : `${basePath}page/${n}/`);
  const nums = new Set<number>([1, totalPages]);
  for (let n = page - 2; n <= page + 2; n++) if (n >= 1 && n <= totalPages) nums.add(n);
  const sorted = [...nums].sort((a, b) => a - b);
  const parts: string[] = [];
  let last = 0;
  for (const n of sorted) {
    if (n - last > 1) parts.push("<span>…</span>");
    parts.push(n === page ? `<span class="cur">${n}</span>` : `<a href="${href(n)}">${n}</a>`);
    last = n;
  }
  const prev = page > 1 ? `<a href="${href(page - 1)}" rel="prev">&laquo; Prev</a>` : "";
  const next = page < totalPages ? `<a href="${href(page + 1)}" rel="next">Next &raquo;</a>` : "";
  return `<nav class="pager" aria-label="Pagination">${prev}${parts.join("")}${next}</nav>`;
}

export interface ListingView {
  heading: string;
  intro?: string;
  basePath: string; // jaise /blog/ ya /category/news/
  page: number;
  totalPages: number;
  items: PostCard[];
  noindex?: boolean;
}

export function renderListing(v: ListingView): string {
  const canonical = absoluteUrl(v.page === 1 ? v.basePath : `${v.basePath}page/${v.page}/`);
  const titleBase = v.page > 1 ? `${v.heading} - Page ${v.page}` : v.heading;
  const description = v.intro ?? `${v.heading} articles from ${blogConfig.siteName}.`;
  const body = `<h1>${escapeHtml(v.heading)}</h1>
${v.intro ? `<p class="meta">${escapeHtml(v.intro)}</p>` : ""}
<div class="grid">${v.items.map(card).join("\n")}</div>
${pager(v.basePath, v.page, v.totalPages)}`;

  return layout({
    title: `${titleBase} | ${blogConfig.siteName}`,
    description,
    canonical,
    robots: v.noindex ? "noindex,follow" : undefined,
    prevUrl: v.page > 1 ? absoluteUrl(v.page === 2 ? v.basePath : `${v.basePath}page/${v.page - 1}/`) : undefined,
    nextUrl: v.page < v.totalPages ? absoluteUrl(`${v.basePath}page/${v.page + 1}/`) : undefined,
    body,
  });
}

export function renderPost(post: PostView, related: PostCard[]): string {
  const url = absoluteUrl(`/${encodeURI(post.slug)}/`);
  const title = seoTitle(post);
  const description = seoDescription(post);
  const img = post.featuredImage;
  const isPost = post.type === "post";
  const category = post.categories.find((c) => c.slug === post.primaryCategory) ?? post.categories[0];

  const crumbs = isPost
    ? `<nav class="crumbs"><a href="/">Home</a> &rsaquo; <a href="/blog/">Blog</a>${
        category ? ` &rsaquo; <a href="/category/${encodeURI(category.slug)}/">${escapeHtml(category.name)}</a>` : ""
      }</nav>`
    : `<nav class="crumbs"><a href="/">Home</a></nav>`;

  const meta = isPost
    ? `<p class="meta">By <a href="/author/${encodeURI(post.authorLogin)}/">${escapeHtml(post.authorName || post.authorLogin)}</a> &middot; <time datetime="${new Date(post.publishedAt).toISOString()}">${formatDate(post.publishedAt)}</time> &middot; ${post.readingMinutes} min read</p>`
    : "";

  const featured =
    isPost && img
      ? `<img class="featured" src="${escapeHtml(img.path)}" alt="${escapeHtml(img.alt || post.title)}"${img.width && img.height ? ` width="${img.width}" height="${img.height}"` : ""} fetchpriority="high">`
      : "";

  const tags = post.tags.length
    ? `<p class="tags">${post.tags.map((t) => `<a href="/tag/${encodeURI(t.slug)}/">${escapeHtml(t.name)}</a>`).join("")}</p>`
    : "";

  const relatedHtml = related.length
    ? `<section class="related"><h2>Related articles</h2><div class="grid">${related.map(card).join("\n")}</div></section>`
    : "";

  const body = `<article class="narrow" style="margin:0 auto">
${crumbs}
<h1>${escapeHtml(post.title)}</h1>
${meta}
${featured}
<div class="content">${post.content}</div>
${tags}
</article>
${relatedHtml}`;

  const jsonLd: object[] = isPost
    ? [
        {
          "@context": "https://schema.org",
          "@type": "BlogPosting",
          headline: post.title,
          description,
          mainEntityOfPage: url,
          datePublished: new Date(post.publishedAt).toISOString(),
          dateModified: new Date(post.modifiedAt).toISOString(),
          author: { "@type": "Person", name: post.authorName || post.authorLogin },
          publisher: { "@type": "Organization", name: blogConfig.siteName },
          ...(img ? { image: absoluteUrl(img.path) } : {}),
        },
      ]
    : [];

  return layout({
    title,
    description,
    canonical: url,
    ogType: isPost ? "article" : "website",
    ogImage: img ? absoluteUrl(img.path) : undefined,
    jsonLd,
    body,
  });
}
