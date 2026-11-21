import { isDbConnected } from "../config/db";
import { AppError } from "../utils/AppError";

// Database na chal raha ho to mongoose latka deta hai, is liye pehle dekhte hain.
export function ensureDb(): void {
  if (!isDbConnected()) {
    throw new AppError(503, "DB_UNAVAILABLE", "The blog is not available right now. Please try again later.");
  }
}

// MongoDB ka "ye cheez pehle se maujood hai" (unique index) ka code
export const isDuplicate = (error: unknown): boolean => (error as { code?: number } | null)?.code === 11000;