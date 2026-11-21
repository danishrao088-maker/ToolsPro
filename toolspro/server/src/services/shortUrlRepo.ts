import { isDbConnected } from "../config/db";
import { ShortUrl } from "../models/ShortUrl";
import { AppError } from "../utils/AppError";
import type { ShortUrlRepo } from "./shortUrlService";

// MongoDB wala asli hissa. Database na chal raha ho to mongoose 10 second latka deta hai, is liye pehle dekhte hain.
function ready(): void {
  if (!isDbConnected()) {
    throw new AppError(503, "DB_UNAVAILABLE", "The short link service is not available right now. Please try again later.");
  }
}

export function createMongoShortUrlRepo(): ShortUrlRepo {
  return {
    async insert(doc) {
      ready();
      try {
        await ShortUrl.create(doc);
        return "ok";
      } catch (error) {
        if ((error as { code?: number }).code === 11000) return "duplicate"; // ye code pehle se maujood hai
        throw error;
      }
    },
    async hit(code, now) {
      ready();
      const found = await ShortUrl.findOneAndUpdate({ code, expiresAt: { $gt: now } }, { $inc: { clicks: 1 } }).lean();
      return found ? { destination: String(found.destination) } : null;
    },
  };
}