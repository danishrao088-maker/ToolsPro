import { Schema, model } from "mongoose";

// WordPress ke static pages (jaise write-for-us, disclaimer). Ye blog ke posts ki list mein nahi aate,
// sirf /<slug>/ par dikhte hain. Dates WordPress wali hi rakhi jati hain, is liye timestamps band hain.
const pageSchema = new Schema(
  {
    wpId: { type: Number, required: true, unique: true },
    title: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    contentHtml: { type: String, default: "" },
    excerpt: { type: String, default: "" },
    metaTitle: { type: String, default: "" },
    metaDescription: { type: String, default: "" },
    publishedAt: { type: Date, required: true },
    updatedAt: { type: Date, required: true },
  },
  { timestamps: false }
);

export const Page = model("Page", pageSchema);
