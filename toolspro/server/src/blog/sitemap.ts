import type { SitemapData } from "./blogService";
import type { PostCard } from "./types";
import { escapeXml } from "./content";
import { absoluteUrl } from "./render";
import { blogConfig } from "./config";
import { LEGACY_REDIRECTS, RESERVED_SLUGS } from "./reserved";

export function buildSitemap(data: SitemapData): string {
  const urls: { loc: string; lastmod?: Date }[] = [
    { loc: absoluteUrl("/") },
    { loc: absoluteUrl("/tools") },
    { loc: absoluteUrl("/blog/") },
  ];

  for (const slug of data.categories) {
    urls.push({ loc: absoluteUrl(`/category/${encodeURI(slug)}/`) });
  }
  for (const p of data.posts) {
    // jin pages ka React/redirect hai unhe sitemap mein nahi daalte
    if (RESERVED_SLUGS.has(p.slug) || LEGACY_REDIRECTS[p.slug]) continue;
    urls.push({ loc: absoluteUrl(`/${encodeURI(p.slug)}/`), lastmod: p.modifiedAt });
  }

  const body = urls
    .map(
      (u) =>
        `<url><loc>${escapeXml(u.loc)}</loc>${
          u.lastmod && u.lastmod.getTime() > 0 ? `<lastmod>${new Date(u.lastmod).toISOString()}</lastmod>` : ""
        }</url>`
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${body}
</urlset>`;
}

export function buildRss(posts: PostCard[]): string {
  const items = posts
    .map((p) => {
      const link = absoluteUrl(`/${encodeURI(p.slug)}/`);
      return `<item>
<title>${escapeXml(p.title)}</title>
<link>${escapeXml(link)}</link>
<guid isPermaLink="true">${escapeXml(link)}</guid>
<pubDate>${new Date(p.publishedAt).toUTCString()}</pubDate>
<description>${escapeXml(p.excerpt)}</description>
</item>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
<channel>
<title>${escapeXml(blogConfig.siteName)}</title>
<link>${escapeXml(blogConfig.siteUrl)}</link>
<description>${escapeXml(`Latest articles from ${blogConfig.siteName}`)}</description>
${items}
</channel>
</rss>`;
}
