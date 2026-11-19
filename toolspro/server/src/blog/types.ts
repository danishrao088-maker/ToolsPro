// Blog ke SEO pages ki andaruni shakal. Database ki shakal (Post/Term) se alag rakhi hai,
// taake render.ts, sitemap.ts aur routes ko database ka pata na ho.

export interface Term {
  name: string;
  slug: string;
}

export interface FeaturedImage {
  path: string; // jaise /wp-content/uploads/2021/04/construction.jpg
  alt: string;
  width?: number;
  height?: number;
  cardPath?: string; // list pages ke liye chhota size
  cardWidth?: number;
  cardHeight?: number;
}

// Ek post ya page, jaisa public page par dikhta hai
export interface PostView {
  slug: string;
  type: "post" | "page";
  title: string;
  content: string; // saaf kiya hua HTML
  excerpt: string;
  publishedAt: Date;
  modifiedAt: Date;
  authorLogin: string;
  authorName: string;
  categories: Term[]; // pehli category sab se upar wali (primary) hoti hai
  primaryCategory?: string; // slug
  tags: Term[];
  featuredImage?: FeaturedImage;
  seo: { title?: string; description?: string };
  readingMinutes: number;
}

export type PostCard = Omit<PostView, "content">;

// WordPress ki export file se bana hua record (importer ke liye)
export interface WpRecord {
  wpId: number;
  type: "post" | "page";
  status: "publish" | "draft";
  slug: string;
  title: string;
  content: string;
  excerpt: string;
  publishedAt: Date;
  modifiedAt: Date;
  authorLogin: string;
  authorName: string;
  categories: Term[]; // jo post ko assign hain
  categoryTrail: Term[]; // assign + parent categories (archive pages ke liye)
  primaryCategory?: string; // slug
  tags: Term[];
  featuredImage?: FeaturedImage;
  seo: { title?: string; description?: string; focusKeyword?: string };
  views: number;
  readingMinutes: number;
  legacyUrl: string;
}
