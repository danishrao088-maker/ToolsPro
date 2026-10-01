import { isDbConnected } from "../config/db";
import { ContactMessage } from "../models/ContactMessage";
import { AppError } from "../utils/AppError";
import type { ContactInput } from "../validators/contactValidators";

export async function saveContactMessage(input: ContactInput): Promise<void> {
  if (!isDbConnected()) {
    throw new AppError(
      503,
      "DATABASE_UNAVAILABLE",
      "The contact form is temporarily unavailable. Please try again later."
    );
  }
  const { name, email, subject, message } = input;
  await ContactMessage.create({ name, email, subject, message });
}