import { Schema, model } from "mongoose";

const RETENTION_SECONDS = 60 * 60 * 24 * 90; // 90 din

const contactMessageSchema = new Schema({
  name: { type: String, required: true, trim: true, maxlength: 100 },
  email: { type: String, required: true, trim: true, lowercase: true, maxlength: 254 },
  subject: { type: String, required: true, trim: true, maxlength: 150 },
  message: { type: String, required: true, trim: true, maxlength: 2000 },
  createdAt: { type: Date, default: Date.now, expires: RETENTION_SECONDS },
});

export const ContactMessage = model("ContactMessage", contactMessageSchema);