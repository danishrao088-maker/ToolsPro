import { Schema, model } from "mongoose";

// Chhota link: code -> asal address. Expire hone par MongoDB khud record hata deta hai (TTL index).
const shortUrlSchema = new Schema(
  {
    code: { type: String, required: true, unique: true },
    destination: { type: String, required: true },
    clicks: { type: Number, default: 0 },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);
shortUrlSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const ShortUrl = model("ShortUrl", shortUrlSchema);