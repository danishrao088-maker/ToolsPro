import { describe, expect, it } from "vitest";
import { saveContactMessage } from "../src/services/contactService";
import { AppError } from "../src/utils/AppError";

describe("saveContactMessage", () => {
  it("fails safely with 503 when the database is not connected", async () => {
    const promise = saveContactMessage({
      name: "Ali",
      email: "ali@example.com",
      subject: "Hello",
      message: "This is a test message.",
    });
    await expect(promise).rejects.toBeInstanceOf(AppError);
    await expect(promise).rejects.toMatchObject({
      statusCode: 503,
      code: "DATABASE_UNAVAILABLE",
    });
  });
});