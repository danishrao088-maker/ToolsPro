import fs from "node:fs";
import { buildPageFields, buildPostFields, collectTerms } from "../importMap";
import { parseWxr, type ParsedExport } from "../wxr";
import { LEGACY_REDIRECTS, RESERVED_SLUGS } from "../reserved";

// Istemal:
//   npm run import:wp -- --file=export.xml --dry-run     (sirf check, DB mein kuch nahi likhta)
//   npm run import:wp -- --file=export.xml               (naye posts import; jo pehle se import hain unhein chhedta nahi)
// Options:
//   --update          pehle se import hue posts ko WordPress ki halat par wapas likh dena (admin ki edits mit jati hain)
//   --reset           pehle WordPress se aaye hue posts/pages DB se hata dena (sirf wo jin mein wpId ho), phir import
//   --include-drafts  draft bhi lana       --limit=50  sirf pehle 50

function getArg(name: string): string | undefined {
  const hit = process.argv.find((a) => a === `--${name}` || a.startsWith(`--${name}=`));
  if (!hit) return undefined;
  return hit.includes("=") ? hit.slice(hit.indexOf("=") + 1) : "true";
}

function summarize(p: ParsedExport): void {
  const posts = p.records.filter((r) => r.type === "post");
  const pages = p.records.filter((r) => r.type === "page");
  const cats = new Map<string, number>();
  const tags = new Set<string>();
  for (const r of posts) {
    for (const c of r.categoryTrail) cats.set(c.slug, (cats.get(c.slug) ?? 0) + 1);
    for (const t of r.tags) tags.add(t.slug);
  }

  const slugCount = new Map<string, number>();
  for (const r of p.records) slugCount.set(r.slug, (slugCount.get(r.slug) ?? 0) + 1);
  const duplicates = [...slugCount].filter(([, n]) => n > 1).map(([s]) => s);
  const reserved = p.records.filter((r) => RESERVED_SLUGS.has(r.slug)).map((r) => `${r.type}:${r.slug}`);
  const redirected = p.records.filter((r) => r.type === "page" && LEGACY_REDIRECTS[r.slug]).map((r) => r.slug);

  const pct = (n: number) => `${n} (${posts.length ? Math.round((n / posts.length) * 100) : 0}%)`;
  console.log("\n=== WordPress export summary ===");
  console.log(`Site:                   ${p.siteName} (${p.siteUrl})`);
  console.log(`Published posts:        ${posts.length}`);
  console.log(`Pages:                  ${pages.length}  [${pages.map((x) => x.slug).join(", ")}]`);
  console.log(`Drafts skipped:         ${p.skippedDrafts}`);
  console.log(`Categories used:        ${cats.size}`);
  console.log(`Tags used:              ${tags.size}`);
  console.log(`Posts with feat. image: ${pct(posts.filter((r) => r.featuredImage).length)}`);
  console.log(`  ...with card size:    ${pct(posts.filter((r) => r.featuredImage?.cardPath).length)}`);
  console.log(`Posts with SEO desc:    ${pct(posts.filter((r) => r.seo.description).length)}`);
  console.log(`Posts with SEO title:   ${pct(posts.filter((r) => r.seo.title).length)}`);
  console.log(`Duplicate slugs:        ${duplicates.length ? duplicates.join(", ") : "none"}`);
  console.log(`Reserved slug clashes:  ${reserved.length ? reserved.join(", ") : "none"}`);
  console.log(`Pages with redirects:   ${redirected.length ? redirected.join(", ") : "none"}`);
  console.log(`Warnings:               ${p.warnings.length}`);
  for (const w of p.warnings.slice(0, 10)) console.log(`  - ${w}`);
  if (p.warnings.length > 10) console.log(`  ... aur ${p.warnings.length - 10}`);
}

function printSamples(p: ParsedExport): void {
  const sample = p.records.filter((r) => r.type === "post").slice(0, 2);
  console.log("\n=== Sample posts ===");
  for (const r of sample) {
    console.log(
      JSON.stringify(
        {
          slug: r.slug,
          title: r.title,
          publishedAt: r.publishedAt,
          author: r.authorName,
          categories: r.categories.map((c) => c.slug),
          categoryTrail: r.categoryTrail.map((c) => c.slug),
          primaryCategory: r.primaryCategory,
          tags: r.tags.slice(0, 4).map((t) => t.slug),
          featuredImage: r.featuredImage,
          seo: r.seo,
          views: r.views,
          readingMinutes: r.readingMinutes,
          excerpt: r.excerpt,
          contentStart: r.content.slice(0, 200),
        },
        null,
        2
      )
    );
  }
}

type Op = Record<string, unknown>;
const BATCH = 200;

function writeErrors(err: unknown): string[] {
  const e = err as { writeErrors?: { errmsg?: string }[]; message?: string };
  if (e.writeErrors?.length) return e.writeErrors.map((w) => w.errmsg ?? "write error");
  return [e.message ?? String(err)];
}

async function main(): Promise<void> {
  const file = getArg("file");
  const dryRun = getArg("dry-run") !== undefined;
  const includeDrafts = getArg("include-drafts") !== undefined;
  const update = getArg("update") !== undefined;
  const reset = getArg("reset") !== undefined;
  const limit = Number(getArg("limit") ?? 0);

  if (!file) {
    console.error("Istemal: npm run import:wp -- --file=<export.xml> [--dry-run] [--update] [--reset] [--include-drafts] [--limit=N]");
    process.exit(1);
  }

  const xml = fs.readFileSync(file, "utf8");
  const parsed = parseWxr(xml, { includeDrafts });
  if (limit > 0) parsed.records = parsed.records.slice(0, limit);

  summarize(parsed);
  printSamples(parsed);

  if (dryRun) {
    console.log("\nDry-run: database mein kuch nahi likha gaya.");
    return;
  }

  // DB sirf asal import mein load hota hai (taake dry-run ke liye .env zaroori na ho)
  const { connectDB, isDbConnected } = await import("../../config/db");
  const mongoose = (await import("mongoose")).default;
  const { Post } = await import("../../models/Post");
  const { Page } = await import("../../models/Page");
  const { Term } = await import("../../models/Term");

  await connectDB();
  if (!isDbConnected()) {
    console.error("MongoDB se connect nahi hua. MONGODB_URI aur Atlas ka Network Access check karein.");
    process.exit(1);
  }
  console.log(`\nDatabase: ${mongoose.connection.name} (host: ${mongoose.connection.host})`);

  if (reset) {
    const removedPosts = await Post.deleteMany({ wpId: { $exists: true } });
    const removedPages = await Page.deleteMany({});
    console.log(`--reset: ${removedPosts.deletedCount} WordPress posts aur ${removedPages.deletedCount} pages hataye.`);
  }

  await Promise.all([Post.syncIndexes(), Page.syncIndexes(), Term.syncIndexes()]);

  // 1) Categories aur tags (jo pehle se hain unhein chhedta nahi)
  const sets = collectTerms(parsed.records);
  const termOps: Op[] = [
    ...sets.categories.map((t) => ({ kind: "category" as const, t })),
    ...sets.tags.map((t) => ({ kind: "tag" as const, t })),
  ].map(({ kind, t }) => ({
    updateOne: {
      filter: { kind, slug: t.slug },
      update: { $setOnInsert: { name: t.name, description: "" } },
      upsert: true,
    },
  }));
  let termErrors: string[] = [];
  for (let i = 0; i < termOps.length; i += 500) {
    try {
      await Term.bulkWrite(termOps.slice(i, i + 500) as never, { ordered: false });
    } catch (err) {
      termErrors = termErrors.concat(writeErrors(err));
    }
  }
  const ids = new Map<string, unknown>();
  for (const t of (await Term.find().select("kind slug").lean()) as unknown as { _id: unknown; kind: string; slug: string }[]) {
    ids.set(`${t.kind}:${t.slug}`, t._id);
  }
  console.log(`Categories: ${sets.categories.length}, tags: ${sets.tags.length} (errors: ${termErrors.length})`);
  for (const e of termErrors.slice(0, 5)) console.log(`  - ${e}`);

  // 2) Posts
  const posts = parsed.records.filter((r) => r.type === "post");
  const postErrors: string[] = [];
  for (let i = 0; i < posts.length; i += BATCH) {
    const ops: Op[] = posts.slice(i, i + BATCH).map((r) => {
      const { createdAt, ...rest } = buildPostFields(r, (kind, slug) => ids.get(`${kind}:${slug}`));
      return {
        updateOne: {
          filter: { wpId: r.wpId },
          update: update ? { $set: rest, $setOnInsert: { createdAt } } : { $setOnInsert: { ...rest, createdAt } },
          upsert: true,
          timestamps: false, // WordPress wali asal tareekhein rakhni hain
          overwriteImmutable: true,
        },
      };
    });
    try {
      await Post.bulkWrite(ops as never, { ordered: false });
    } catch (err) {
      postErrors.push(...writeErrors(err));
    }
    console.log(`  posts ${Math.min(i + BATCH, posts.length)} / ${posts.length}`);
  }

  // 3) Pages (write-for-us, disclaimer waghera)
  const pages = parsed.records.filter((r) => r.type === "page");
  const pageErrors: string[] = [];
  if (pages.length > 0) {
    const ops: Op[] = pages.map((r) => ({
      updateOne: {
        filter: { wpId: r.wpId },
        update: update ? { $set: buildPageFields(r) } : { $setOnInsert: buildPageFields(r) },
        upsert: true,
      },
    }));
    try {
      await Page.bulkWrite(ops as never, { ordered: false });
    } catch (err) {
      pageErrors.push(...writeErrors(err));
    }
  }

  const [postTotal, pageTotal, catTotal, tagTotal] = await Promise.all([
    Post.countDocuments({ wpId: { $exists: true } }),
    Page.countDocuments(),
    Term.countDocuments({ kind: "category" }),
    Term.countDocuments({ kind: "tag" }),
  ]);
  console.log(`\nErrors: posts ${postErrors.length}, pages ${pageErrors.length}, terms ${termErrors.length}`);
  for (const e of [...postErrors, ...pageErrors].slice(0, 10)) console.log(`  - ${e}`);
  console.log(`DB mein ab: WordPress posts ${postTotal}, pages ${pageTotal}, categories ${catTotal}, tags ${tagTotal}`);
  await mongoose.disconnect();
  if (postErrors.length + pageErrors.length + termErrors.length > 0) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
