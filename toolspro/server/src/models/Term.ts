import { Schema, model } from "mongoose";

// Category aur tag dono is ek model me hain; "kind" batata hai ke kaun sa hai.
const termSchema = new Schema(
  {
    kind: { type: String, enum: ["category", "tag"], required: true },
    name: { type: String, required: true },
    slug: { type: String, required: true },
    description: { type: String, default: "" },
  },
  { timestamps: true }
);
termSchema.index({ kind: 1, slug: 1 }, { unique: true });

export const Term = model("Term", termSchema);