import mongoose from "mongoose";
import { z } from "zod";
import { connectDB, isDbConnected } from "../src/config/db";
import { AdminUser } from "../src/models/AdminUser";
import { hashPassword, passwordProblem } from "../src/services/adminPassword";
import { ask } from "./prompt";

// Admin ka account banane (ya password badalne) ki script:
//   npm run admin:create            -> pehla admin banata hai
//   npm run admin:create -- --reset -> maujooda admin ka password badalta hai
async function main(): Promise<number> {
  const reset = process.argv.includes("--reset");
  if (!process.stdin.isTTY) {
    console.error("Run this command in an interactive terminal, because it asks for the password.");
    return 1;
  }

  const email = (await ask("Admin email: ", false)).trim().toLowerCase();
  if (!z.email().safeParse(email).success) {
    console.error("That is not a valid email address.");
    return 1;
  }
  const password = await ask("Password (at least 12 characters, not shown): ", true);
  const problem = passwordProblem(password);
  if (problem) {
    console.error(problem);
    return 1;
  }
  if (password !== (await ask("Repeat the password: ", true))) {
    console.error("The two passwords are not the same.");
    return 1;
  }

  await connectDB();
  if (!isDbConnected()) {
    console.error("Could not connect to MongoDB. Check MONGODB_URI in .env.");
    return 1;
  }

  const existing = await AdminUser.findOne().lean();
  if (existing && existing.email !== email) {
    console.error(`An admin already exists (${existing.email}). Only one admin account is supported.`);
    return 1;
  }
  if (existing && !reset) {
    console.error("This admin already exists. To change the password run: npm run admin:create -- --reset");
    return 1;
  }
  if (!existing && reset) {
    console.error("There is no admin to reset yet. Run the command without --reset first.");
    return 1;
  }

  const passwordHash = await hashPassword(password);
  if (existing) {
    await AdminUser.updateOne({ _id: existing._id }, { passwordHash });
    console.log("The admin password was changed.");
  } else {
    await AdminUser.create({ email, passwordHash });
    console.log(`The admin account ${email} was created.`);
  }
  return 0;
}

main()
  .then(async (code) => {
    await mongoose.disconnect();
    process.exit(code);
  })
  .catch(async (error: unknown) => {
    console.error("Failed:", error instanceof Error ? error.message : error);
    await mongoose.disconnect();
    process.exit(1);
  });