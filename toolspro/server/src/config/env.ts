import "dotenv/config";
import { randomBytes } from "node:crypto";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().default(5000),
  MONGODB_URI: z.string().min(1),
  CLIENT_ORIGINS: z.string().default("http://localhost:5173"),
  // Admin login ke token par dastkhat ka raaz. Kam az kam 32 harf.
  ADMIN_SESSION_SECRET: z.string().min(32, "ADMIN_SESSION_SECRET must be at least 32 characters").optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment variables:", parsed.error.flatten().fieldErrors);
  process.exit(1);
}

if (parsed.data.NODE_ENV === "production" && !parsed.data.ADMIN_SESSION_SECRET) {
  console.error("Invalid environment variables: ADMIN_SESSION_SECRET is required in production.");
  process.exit(1);
}

export const env = {
  ...parsed.data,
  CLIENT_ORIGINS: parsed.data.CLIENT_ORIGINS.split(",").map((o) => o.trim()),
  // Development/test me secret na ho to har baar naya bana leta hai (server restart par admin dobara login karega)
  ADMIN_SESSION_SECRET: parsed.data.ADMIN_SESSION_SECRET ?? randomBytes(32).toString("hex"),
};