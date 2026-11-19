import { XMLParser } from "fast-xml-parser";
import type { FeaturedImage, Term, WpRecord } from "./types";
import { cleanContent, decodeEntities, fallbackTitle, makeExcerpt, readingMinutes } from "./content";

// WordPress ki export file (WXR, XML) ko padh kar Post records banata hai.
// Yeh file DB ko nahi chhoti, isliye dry-run aur tests mein bhi chalti hai.

type Obj = Record<string, unknown>;

const ARRAY_TAGS = new Set(["item", "wp:postmeta", "category", "wp:category", "wp:tag", "wp:author"]);

function str(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "object") return str((v as Obj)["#text"]);
  return String(v);
}

function asArray(v: unknown): Obj[] {
  if (v == null) return [];
  return (Array.isArray(v) ? v : [v]) as Obj[];
}

function safeDecodeURI(s: string): string {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}

function parseWpDate(gmt: string, local: string): Date {
  for (const raw of [gmt, local]) {
    if (!raw || raw.startsWith("0000")) continue;
    const d = new Date(raw.replace(" ", "T") + "Z");
    if (!Number.isNaN(d.getTime())) return d;
  }
  return new Date(0);
}

export interface ParseOptions {
  includeDrafts?: boolean;
}

export interface ParsedExport {
  siteUrl: string;
  siteName: string;
  records: WpRecord[];
  warnings: string[];
  skippedDrafts: number;
}

interface ImageInfo {
  path: string;
  alt: string;
  width?: number;
  height?: number;
  cardPath?: string;
  cardWidth?: number;
  cardHeight?: number;
}

function parseImageMeta(serialized: string): Pick<ImageInfo, "width" | "height" | "cardPath" | "cardWidth" | "cardHeight"> {
  // _wp_attachment_metadata PHP serialize format mein hota hai.
  const out: ReturnType<typeof parseImageMeta> = {};
  const full = serialized.match(/^a:\d+:\{s:\d+:"width";i:(\d+);s:\d+:"height";i:(\d+);/);
  if (full) {
    out.width = Number(full[1]);
    out.height = Number(full[2]);
  }
  const file = serialized.match(/s:\d+:"file";s:\d+:"([^"]+)";/);
  const dir = file ? file[1].replace(/[^/]+$/, "") : "";
  for (const size of ["medium_large", "medium"]) {
    const m = serialized.match(
      new RegExp(
        `s:\\d+:"${size}";a:\\d+:\\{s:\\d+:"file";s:\\d+:"([^"]+)";s:\\d+:"width";i:(\\d+);s:\\d+:"height";i:(\\d+);`
      )
    );
    if (m) {
      out.cardPath = `/wp-content/uploads/${dir}${m[1]}`;
      out.cardWidth = Number(m[2]);
      out.cardHeight = Number(m[3]);
      break;
    }
  }
  return out;
}

export function parseWxr(xml: string, options: ParseOptions = {}): ParsedExport {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    parseTagValue: false,
    parseAttributeValue: false,
    trimValues: true,
    isArray: (name) => ARRAY_TAGS.has(name),
  });

  const doc = parser.parse(xml) as Obj;
  const channel = ((doc.rss as Obj | undefined)?.channel ?? {}) as Obj;
  const warnings: string[] = [];

  const siteUrl = str(channel["wp:base_site_url"]).replace(/\/+$/, "");
  const siteName = decodeEntities(str(channel.title));
  let siteHost = "";
  try {
    siteHost = new URL(siteUrl).hostname.replace(/^www\./, "");
  } catch {
    warnings.push("wp:base_site_url samajh nahi aaya, links relative nahi banenge");
  }

  // Authors: login -> display name (email jaan-boojh kar store nahi karte)
  const authors = new Map<string, string>();
  for (const a of asArray(channel["wp:author"])) {
    authors.set(str(a["wp:author_login"]), decodeEntities(str(a["wp:author_display_name"])));
  }

  // Categories: id/slug maps, aur parent chain
  const catById = new Map<string, Term>();
  const catParent = new Map<string, string>(); // slug -> parent slug
  for (const c of asArray(channel["wp:category"])) {
    const slug = safeDecodeURI(str(c["wp:category_nicename"]));
    const term: Term = { name: decodeEntities(str(c["wp:cat_name"])), slug };
    catById.set(str(c["wp:term_id"]), term);
    const parent = safeDecodeURI(str(c["wp:category_parent"]));
    if (parent) catParent.set(slug, parent);
  }
  const catBySlug = new Map<string, Term>([...catById.values()].map((t) => [t.slug, t]));

  const items = asArray(channel.item);

  // Pehle attachments (images)
  const images = new Map<string, ImageInfo>();
  for (const it of items) {
    if (str(it["wp:post_type"]) !== "attachment") continue;
    const meta = metaMap(it);
    const file = meta.get("_wp_attached_file") ?? "";
    let path = file ? `/wp-content/uploads/${file}` : "";
    if (!path) {
      try {
        path = new URL(str(it["wp:attachment_url"])).pathname;
      } catch {
        continue;
      }
    }
    images.set(str(it["wp:post_id"]), {
      path,
      alt: decodeEntities(meta.get("_wp_attachment_image_alt") ?? ""),
      ...parseImageMeta(meta.get("_wp_attachment_metadata") ?? ""),
    });
  }

  const records: WpRecord[] = [];
  let skippedDrafts = 0;

  for (const it of items) {
    const type = str(it["wp:post_type"]);
    if (type !== "post" && type !== "page") continue;

    const rawStatus = str(it["wp:status"]);
    if (rawStatus !== "publish" && !(options.includeDrafts && rawStatus === "draft")) {
      if (rawStatus === "draft") skippedDrafts++;
      continue;
    }

    const wpId = Number(str(it["wp:post_id"]));
    const slug = safeDecodeURI(str(it["wp:post_name"]));
    if (!slug) {
      warnings.push(`wpId ${wpId}: slug khali hai, skip kiya`);
      continue;
    }

    const meta = metaMap(it);

    // Terms
    const categories: Term[] = [];
    const tags: Term[] = [];
    for (const c of asArray(it.category)) {
      const term: Term = {
        name: decodeEntities(str(c)),
        slug: safeDecodeURI(String(c["@_nicename"] ?? "")),
      };
      if (!term.slug) continue;
      if (c["@_domain"] === "category") categories.push(term);
      else if (c["@_domain"] === "post_tag") tags.push(term);
    }

    // Category trail = assigned + unke parents (WordPress parent archive mein child posts dikhata hai)
    const trail = new Map<string, Term>();
    for (const c of categories) {
      let slugCursor: string | undefined = c.slug;
      let guard = 0;
      while (slugCursor && guard++ < 10) {
        const t: Term | undefined = catBySlug.get(slugCursor) ?? (slugCursor === c.slug ? c : undefined);
        if (t && !trail.has(t.slug)) trail.set(t.slug, t);
        slugCursor = catParent.get(slugCursor);
      }
    }

    // Primary category
    const primaryId = meta.get("rank_math_primary_category") ?? meta.get("_yoast_wpseo_primary_category");
    let primaryCategory = primaryId ? catById.get(primaryId)?.slug : undefined;
    if (!primaryCategory || !categories.some((c) => c.slug === primaryCategory)) {
      primaryCategory = categories[0]?.slug;
    }

    // Featured image
    let featuredImage: FeaturedImage | undefined;
    const thumbId = meta.get("_thumbnail_id");
    if (thumbId) {
      const img = images.get(thumbId);
      if (img) featuredImage = { ...img };
      else warnings.push(`wpId ${wpId} (${slug}): thumbnail ${thumbId} ka attachment nahi mila`);
    }

    const content = cleanContent(str(it["content:encoded"]), siteHost ? [siteHost] : []);
    let title = decodeEntities(str(it.title)).trim();
    if (!title) {
      title = fallbackTitle(content, slug);
      warnings.push(`wpId ${wpId} (${slug}): title khali tha, "${title}" lagaya`);
    }
    if (!content && type === "post") warnings.push(`wpId ${wpId} (${slug}): content khali hai`);

    const rawExcerpt = str(it["excerpt:encoded"]);
    const excerpt = makeExcerpt(rawExcerpt || content, 160);

    const authorLogin = str(it["dc:creator"]);
    const seoTitle = meta.get("rank_math_title") ?? meta.get("_yoast_wpseo_title");
    const seoDescription = meta.get("rank_math_description") ?? meta.get("_yoast_wpseo_metadesc");
    const focus = meta.get("rank_math_focus_keyword") ?? meta.get("_yoast_wpseo_focuskw");

    const published = parseWpDate(str(it["wp:post_date_gmt"]), str(it["wp:post_date"]));
    const modified = parseWpDate(str(it["wp:post_modified_gmt"]), str(it["wp:post_modified"]));

    records.push({
      wpId,
      type,
      status: rawStatus === "draft" ? "draft" : "publish",
      slug,
      title,
      content,
      excerpt,
      publishedAt: published,
      modifiedAt: modified.getTime() > 0 ? modified : published,
      authorLogin,
      authorName: authors.get(authorLogin) ?? authorLogin,
      categories,
      categoryTrail: [...trail.values()],
      primaryCategory,
      tags,
      featuredImage,
      seo: {
        title: seoTitle ? decodeEntities(seoTitle) : undefined,
        description: seoDescription ? decodeEntities(seoDescription) : undefined,
        focusKeyword: focus ? decodeEntities(focus) : undefined,
      },
      views: parseInt(meta.get("post_views_count") ?? "0", 10) || 0,
      readingMinutes: readingMinutes(content),
      legacyUrl: str(it.link),
    });
  }

  records.sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime());
  return { siteUrl, siteName, records, warnings, skippedDrafts };
}

function metaMap(item: Obj): Map<string, string> {
  const m = new Map<string, string>();
  for (const pm of asArray(item["wp:postmeta"])) {
    const key = str(pm["wp:meta_key"]);
    if (key && !m.has(key)) m.set(key, str(pm["wp:meta_value"]));
  }
  return m;
}
