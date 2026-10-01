    import { AppError } from "../utils/AppError";
import { asyncHandler } from "../utils/asyncHandler";
import { contactSchema } from "../validators/contactValidators";
import { saveContactMessage } from "../services/contactService";

export const submitContact = asyncHandler(async (req, res) => {
  const parsed = contactSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new AppError(
      400,
      "VALIDATION_ERROR",
      "Please check the highlighted fields.",
      parsed.error.flatten().fieldErrors
    );
  }

  // Honeypot bhara hai to ye bot hai: kuch save na karein, chup chaap jawab dein
  if (parsed.data.website) {
    res.status(201).json({ success: true, data: { received: true } });
    return;
  }

  await saveContactMessage(parsed.data);
  res.status(201).json({ success: true, data: { received: true } });
});