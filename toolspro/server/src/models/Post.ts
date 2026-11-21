import { Schema, model } from "mongoose";

// Blog post. Content wo HTML hai jo server pehle hi saaf (sanitize) kar chuka hota hai.
const postSchema = new Schema(
  {
    title: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    excerpt: { type: String, default: "" },
    contentHtml: { type: String, default: "" },
    status: { type: String, enum: ["draft", "published"], default: "draft" },
    publishedAt: { type: Date, default: null },
    category: { type: Schema.Types.ObjectId, ref: "Term", default: null },
    tags: { type: [{ type: Schema.Types.ObjectId, ref: "Term" }], default: [] },
    featuredImageUrl: { type: String, default: "" },
    featuredImageAlt: { type: String, default: "" },
    metaTitle: { type: String, default: "" },
    metaDescription: { type: String, default: "" },
    readingMinutes: { type: Number, default: 1 },

    // --- WordPress se aaye hue posts ke liye optional hissay (admin ke naye posts mein ye khali rehte hain) ---
    wpId: { type: Number }, // WordPress ka post ID (dobara import par wahi post update hota hai)
    authorName: { type: String, default: "" },
    authorLogin: { type: String, default: "" },
    // WordPress ki saari categories (parents samet). "category" upar wali main category hi rehti hai.
    categories: { type: [{ type: Schema.Types.ObjectId, ref: "Term" }], default: [] },
    featuredImageWidth: { type: Number },
    featuredImageHeight: { type: Number },
    featuredImageCardUrl: { type: String, default: "" }, // list ke liye chhota size
    featuredImageCardWidth: { type: Number },
    featuredImageCardHeight: { type: Number },
  },
  { timestamps: true }
);
postSchema.index({ status: 1, publishedAt: -1 });
postSchema.index({ category: 1 });
postSchema.index({ tags: 1 });
postSchema.index({ categories: 1 });
postSchema.index({ authorLogin: 1, publishedAt: -1 });
postSchema.index({ wpId: 1 }, { unique: true, sparse: true });

export const Post = model("Post", postSchema);