import { Types, isValidObjectId, type PipelineStage } from "mongoose";
import { Post } from "../models/Post";
import { Term } from "../models/Term";
import { ensureDb, isDuplicate } from "./blogRepoShared";
import type { TermFields, TermRecord, TermRepo } from "./blogTypes";

interface RawTerm {
  _id: Types.ObjectId;
  name: string;
  slug: string;
  description: string;
}

const oid = (id: string) => new Types.ObjectId(id);

function toRecord(raw: RawTerm, postCount: number): TermRecord {
  return { id: String(raw._id), name: raw.name, slug: raw.slug, description: raw.description ?? "", postCount };
}

// Category ya tag ke liye MongoDB wala asli hissa ("kind" se pata chalta hai kaun sa)
export function createMongoTermRepo(kind: "category" | "tag"): TermRepo {
  async function counts(publishedOnly: boolean): Promise<Map<string, number>> {
    const match = publishedOnly ? [{ $match: { status: "published" } }] : [];
    const pipeline: PipelineStage[] =
      kind === "category"
        ? [
            ...match,
            // Main category aur "categories" (WordPress ki saari categories) dono ginte hain, har post ek category mein sirf aik baar
            { $project: { cats: { $setUnion: [["$category"], { $ifNull: ["$categories", []] }] } } },
            { $unwind: "$cats" },
            { $match: { cats: { $ne: null } } },
            { $group: { _id: "$cats", n: { $sum: 1 } } },
          ]
        : [...match, { $unwind: "$tags" }, { $group: { _id: "$tags", n: { $sum: 1 } } }];
    const rows = await Post.aggregate<{ _id: Types.ObjectId; n: number }>(pipeline);
    return new Map(rows.map((row) => [String(row._id), row.n]));
  }

  return {
    async list({ publishedOnly }) {
      ensureDb();
      const [terms, count] = await Promise.all([Term.find({ kind }).sort({ name: 1 }).lean(), counts(publishedOnly)]);
      return (terms as unknown as RawTerm[]).map((term) => toRecord(term, count.get(String(term._id)) ?? 0));
    },

    async findById(id) {
      ensureDb();
      if (!isValidObjectId(id)) return null;
      const found = (await Term.findOne({ _id: oid(id), kind }).lean()) as unknown as RawTerm | null;
      return found ? toRecord(found, 0) : null;
    },

    async slugTaken(slug, exceptId) {
      ensureDb();
      const filter = exceptId && isValidObjectId(exceptId) ? { kind, slug, _id: { $ne: oid(exceptId) } } : { kind, slug };
      return (await Term.exists(filter)) !== null;
    },

    async insert(fields: TermFields) {
      ensureDb();
      try {
        const created = await Term.create({ kind, ...fields });
        return toRecord({ _id: created._id, name: fields.name, slug: fields.slug, description: fields.description }, 0);
      } catch (error) {
        if (isDuplicate(error)) return "duplicate";
        throw error;
      }
    },

    async update(id, fields) {
      ensureDb();
      if (!isValidObjectId(id)) return null;
      try {
        const found = (await Term.findOneAndUpdate({ _id: oid(id), kind }, { $set: fields }, { new: true, runValidators: true }).lean()) as unknown as RawTerm | null;
        return found ? toRecord(found, 0) : null;
      } catch (error) {
        if (isDuplicate(error)) return "duplicate";
        throw error;
      }
    },

    async remove(id) {
      ensureDb();
      if (!isValidObjectId(id)) return false;
      const removed = await Term.findOneAndDelete({ _id: oid(id), kind }).lean();
      if (!removed) return false;
      // Posts band nahi hote, bas unse ye category/tag hat jata hai
      if (kind === "category") {
        await Post.updateMany({ category: oid(id) }, { $set: { category: null } });
        await Post.updateMany({ categories: oid(id) }, { $pull: { categories: oid(id) } });
      } else await Post.updateMany({ tags: oid(id) }, { $pull: { tags: oid(id) } });
      return true;
    },
  };
}