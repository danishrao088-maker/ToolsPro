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
  },
  { timestamps: true }
);
postSchema.index({ status: 1, publishedAt: -1 });
postSchema.index({ category: 1 });
postSchema.index({ tags: 1 });

export const Post = model("Post", postSchema);