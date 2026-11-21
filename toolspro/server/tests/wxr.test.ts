import { describe, expect, it } from "vitest";
import { parseWxr } from "../src/blog/wxr";

const cdata = (s: string) => `<![CDATA[${s}]]>`;

const meta = (key: string, value: string) =>
  `<wp:postmeta><wp:meta_key>${cdata(key)}</wp:meta_key><wp:meta_value>${cdata(value)}</wp:meta_value></wp:postmeta>`;

const SERIALIZED_IMAGE =
  'a:5:{s:5:"width";i:1200;s:6:"height";i:800;s:4:"file";s:23:"2021/04/construction.jpg";' +
  's:5:"sizes";a:2:{s:6:"medium";a:4:{s:4:"file";s:23:"construction-300x200.jpg";s:5:"width";i:300;s:6:"height";i:200;s:9:"mime-type";s:10:"image/jpeg";}' +
  's:12:"medium_large";a:4:{s:4:"file";s:23:"construction-768x512.jpg";s:5:"width";i:768;s:6:"height";i:512;s:9:"mime-type";s:10:"image/jpeg";}}}';

const FIXTURE = `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0" xmlns:excerpt="x" xmlns:content="x" xmlns:wp="x" xmlns:dc="x">
<channel>
  <title>The Source Full &amp; Co</title>
  <wp:base_site_url>https://thesourcefull.com</wp:base_site_url>
  <wp:author><wp:author_login>${cdata("admin")}</wp:author_login><wp:author_email>${cdata("secret@example.com")}</wp:author_email><wp:author_display_name>${cdata("Ali Khan")}</wp:author_display_name></wp:author>
  <wp:category><wp:term_id>1</wp:term_id><wp:category_nicename>${cdata("news")}</wp:category_nicename><wp:category_parent>${cdata("")}</wp:category_parent><wp:cat_name>${cdata("News")}</wp:cat_name></wp:category>
  <wp:category><wp:term_id>2</wp:term_id><wp:category_nicename>${cdata("tech")}</wp:category_nicename><wp:category_parent>${cdata("news")}</wp:category_parent><wp:cat_name>${cdata("Tech")}</wp:cat_name></wp:category>

  <item>
    <title>${cdata("Hero image")}</title>
    <wp:post_id>50</wp:post_id>
    <wp:post_type>${cdata("attachment")}</wp:post_type>
    <wp:attachment_url>${cdata("https://thesourcefull.com/wp-content/uploads/2021/04/construction.jpg")}</wp:attachment_url>
    ${meta("_wp_attached_file", "2021/04/construction.jpg")}
    ${meta("_wp_attachment_image_alt", "A crane")}
    ${meta("_wp_attachment_metadata", SERIALIZED_IMAGE)}
  </item>

  <item>
    <title>${cdata("Hello &amp; welcome")}</title>
    <link>https://thesourcefull.com/hello-world/</link>
    <dc:creator>${cdata("admin")}</dc:creator>
    <content:encoded>${cdata(
      '<!-- wp:paragraph --><p data-id="9" class="x">Hi <a href="https://thesourcefull.com/other/">link</a></p><!-- /wp:paragraph --><script>alert(1)</script><img src="/a.jpg">'
    )}</content:encoded>
    <excerpt:encoded>${cdata("")}</excerpt:encoded>
    <wp:post_id>10</wp:post_id>
    <wp:post_date>${cdata("2021-04-02 10:00:00")}</wp:post_date>
    <wp:post_date_gmt>${cdata("2021-04-02 05:00:00")}</wp:post_date_gmt>
    <wp:post_modified>${cdata("2021-05-01 10:00:00")}</wp:post_modified>
    <wp:post_modified_gmt>${cdata("2021-05-01 05:00:00")}</wp:post_modified_gmt>
    <wp:post_name>${cdata("hello-world")}</wp:post_name>
    <wp:status>${cdata("publish")}</wp:status>
    <wp:post_type>${cdata("post")}</wp:post_type>
    <category domain="category" nicename="tech">${cdata("Tech")}</category>
    <category domain="post_tag" nicename="crane">${cdata("Crane")}</category>
    ${meta("_thumbnail_id", "50")}
    ${meta("rank_math_title", "Rank Math title")}
    ${meta("_yoast_wpseo_title", "Yoast title")}
    ${meta("_yoast_wpseo_metadesc", "Yoast description")}
    ${meta("rank_math_primary_category", "1")}
    ${meta("post_views_count", "42")}
  </item>

  <item>
    <title>${cdata("")}</title>
    <link>https://thesourcefull.com/no-title/</link>
    <dc:creator>${cdata("admin")}</dc:creator>
    <content:encoded>${cdata("<h2>Types of Communication</h2><p>Body text here.</p>")}</content:encoded>
    <wp:post_id>11</wp:post_id>
    <wp:post_date>${cdata("2021-03-01 10:00:00")}</wp:post_date>
    <wp:post_date_gmt>${cdata("0000-00-00 00:00:00")}</wp:post_date_gmt>
    <wp:post_modified>${cdata("0000-00-00 00:00:00")}</wp:post_modified>
    <wp:post_modified_gmt>${cdata("0000-00-00 00:00:00")}</wp:post_modified_gmt>
    <wp:post_name>${cdata("no-title")}</wp:post_name>
    <wp:status>${cdata("publish")}</wp:status>
    <wp:post_type>${cdata("post")}</wp:post_type>
  </item>

  <item>
    <title>${cdata("Draft post")}</title>
    <wp:post_id>12</wp:post_id>
    <wp:post_name>${cdata("draft-post")}</wp:post_name>
    <wp:status>${cdata("draft")}</wp:status>
    <wp:post_type>${cdata("post")}</wp:post_type>
    <content:encoded>${cdata("<p>draft</p>")}</content:encoded>
  </item>

  <item>
    <title>${cdata("About us")}</title>
    <wp:post_id>13</wp:post_id>
    <wp:post_name>${cdata("about")}</wp:post_name>
    <wp:post_date_gmt>${cdata("2020-01-01 00:00:00")}</wp:post_date_gmt>
    <wp:status>${cdata("publish")}</wp:status>
    <wp:post_type>${cdata("page")}</wp:post_type>
    <content:encoded>${cdata("<p>About page</p>")}</content:encoded>
  </item>
</channel>
</rss>`;

describe("parseWxr", () => {
  const result = parseWxr(FIXTURE);
  const bySlug = (slug: string) => result.records.find((r) => r.slug === slug)!;

  it("reads site info and skips drafts and attachments", () => {
    expect(result.siteUrl).toBe("https://thesourcefull.com");
    expect(result.siteName).toBe("The Source Full & Co");
    expect(result.skippedDrafts).toBe(1);
    expect(result.records.map((r) => r.slug).sort()).toEqual(["about", "hello-world", "no-title"]);
  });

  it("includes drafts only when asked", () => {
    const withDrafts = parseWxr(FIXTURE, { includeDrafts: true });
    const draft = withDrafts.records.find((r) => r.slug === "draft-post");
    expect(draft?.status).toBe("draft");
  });

  it("sorts newest first", () => {
    const dates = result.records.map((r) => r.publishedAt.getTime());
    expect(dates).toEqual([...dates].sort((a, b) => b - a));
  });

  it("decodes titles and maps the author display name without email", () => {
    const post = bySlug("hello-world");
    expect(post.title).toBe("Hello & welcome");
    expect(post.authorLogin).toBe("admin");
    expect(post.authorName).toBe("Ali Khan");
    expect(JSON.stringify(result.records)).not.toContain("secret@example.com");
  });

  it("builds the category trail including parents", () => {
    const post = bySlug("hello-world");
    expect(post.categories.map((c) => c.slug)).toEqual(["tech"]);
    expect(post.categoryTrail.map((c) => c.slug)).toEqual(["tech", "news"]);
    expect(post.tags).toEqual([{ name: "Crane", slug: "crane" }]);
  });

  it("falls back to the first assigned category if the primary is not assigned", () => {
    // rank_math_primary_category=1 is "news", which the post does not directly have
    expect(bySlug("hello-world").primaryCategory).toBe("tech");
  });

  it("maps the featured image with a card size", () => {
    const img = bySlug("hello-world").featuredImage!;
    expect(img.path).toBe("/wp-content/uploads/2021/04/construction.jpg");
    expect(img.alt).toBe("A crane");
    expect(img.width).toBe(1200);
    expect(img.height).toBe(800);
    expect(img.cardPath).toBe("/wp-content/uploads/2021/04/construction-768x512.jpg");
    expect(img.cardWidth).toBe(768);
  });

  it("cleans content: no scripts, no wp comments, relative internal links, lazy images", () => {
    const html = bySlug("hello-world").content;
    expect(html).not.toContain("<script");
    expect(html).not.toContain("<!--");
    expect(html).not.toContain("data-id");
    expect(html).toContain('href="/other/"');
    expect(html).toContain('loading="lazy"');
  });

  it("prefers Rank Math SEO fields over Yoast and reads views", () => {
    const post = bySlug("hello-world");
    expect(post.seo.title).toBe("Rank Math title");
    expect(post.seo.description).toBe("Yoast description");
    expect(post.views).toBe(42);
  });

  it("uses a fallback title for empty titles and warns about it", () => {
    expect(bySlug("no-title").title).toBe("Types of Communication");
    expect(result.warnings.some((w) => w.includes("no-title"))).toBe(true);
  });

  it("handles zero GMT dates by falling back to the local date", () => {
    const post = bySlug("no-title");
    expect(post.publishedAt.getUTCFullYear()).toBe(2021);
    expect(post.modifiedAt.getTime()).toBe(post.publishedAt.getTime());
  });

  it("keeps type=page records", () => {
    expect(bySlug("about").type).toBe("page");
  });
});
