import { isValidObjectId } from "mongoose";
import { isDbConnected } from "../config/db";
import { AdminUser } from "../models/AdminUser";
import { AppError } from "../utils/AppError";
import type { AdminRecord, AdminRepo } from "./adminAuthService";

// MongoDB wala asli hissa. Database na chal raha ho to mongoose latka deta hai, is liye pehle dekhte hain.
function ready(): void {
  if (!isDbConnected()) {
    throw new AppError(503, "DB_UNAVAILABLE", "The admin service is not available right now. Please try again later.");
  }
}

function toRecord(found: { _id: unknown; email: string; passwordHash: string } | null): AdminRecord | null {
  return found ? { id: String(found._id), email: found.email, passwordHash: found.passwordHash } : null;
}

export function createMongoAdminRepo(): AdminRepo {
  return {
    async findByEmail(email) {
      ready();
      return toRecord(await AdminUser.findOne({ email }).lean());
    },
    async findById(id) {
      ready();
      if (!isValidObjectId(id)) return null;
      return toRecord(await AdminUser.findById(id).lean());
    },
  };
}