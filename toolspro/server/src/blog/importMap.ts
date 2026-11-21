import type { Term, WpRecord } from "./types";

// WordPress ke record ko aap ke Post/Term/Page ke fields mein badalna. Ye sirf hisaab hai, database nahi chhoota,
// isliye iske tests asani se chal jate hain.

export interface TermSets {
  categories: Term[];
  tags: Term[];
}

// Un categories/tags ki list jo kisi post mein istemal hui (parents samet)
export function collectTerms(records: WpRecord[]): TermSets {
  const categories = new Map<string, Term>();
  const tags = new Map<string, Term>();
  for (const r of records) {
    if (r.type !== "post") continue;
    for (const c of r.categoryTrail) if (!categories.has(c.slug)) categories.set(c.slug, c);
    for (const t of r.tags) if (!tags.has(t.slug)) tags.set(t.slug, t);
  }
  return { categories: [...categories.values()], tags: [...tags.values()] };
}

// undefined wali cheezein hata deta hai (warna MongoDB mein null ban kar save hoti hain)
export function dropUndefined<T extends Record<string, unknown>>(obj: T): T {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined)) as T;
}

// Term ki ID dhoondne wala (asal import mein MongoDB ki ObjectId, tests mein sada string)
export type TermIdLookup<Id> = (kind: "category" | "tag", slug: string) => Id | undefined;

export function buildPostFields<Id>(r: WpRecord, idOf: TermIdLookup<Id>) {
  const img = r.featuredImage;
  const primarySlug = r.primaryCategory ?? r.categories[0]?.slug;
  const ids = (kind: "category" | "tag", terms: Term[]): Id[] =>
    terms.map((t) => idOf(kind, t.slug)).filter((id): id is Id => id !== undefined);

  return dropUndefined({
    title: r.title,
    slug: r.slug,
    excerpt: r.excerpt,
    contentHtml: r.content,
    status: "published" as const,
    publishedAt: r.publishedAt,
    category: (primarySlug ? idOf("category", primarySlug) : undefined) ?? null,
    categories: ids("category", r.categoryTrail),
    tags: ids("tag", r.tags),
    featuredImageUrl: img?.path ?? "",
    featuredImageAlt: img?.alt ?? "",
    featuredImageWidth: img?.width,
    featuredImageHeight: img?.height,
    featuredImageCardUrl: img?.cardPath ?? "",
    featuredImageCardWidth: img?.cardWidth,
    featuredImageCardHeight: img?.cardHeight,
    metaTitle: r.seo.title ?? "",
    metaDescription: r.seo.description ?? "",
    readingMinutes: r.readingMinutes,
    authorName: r.authorName,
    authorLogin: r.authorLogin,
    // WordPress wali asal tareekhein (sitemap aur Google ke liye)
    createdAt: r.publishedAt,
    updatedAt: r.modifiedAt,
  });
}

export function buildPageFields(r: WpRecord) {
  return {
    title: r.title,
    slug: r.slug,
    contentHtml: r.content,
    excerpt: r.excerpt,
    metaTitle: r.seo.title ?? "",
    metaDescription: r.seo.description ?? "",
    publishedAt: r.publishedAt,
    updatedAt: r.modifiedAt,
  };
}
