import { describe, expect, it } from "vitest";
import { LIMITS, serverErrorsToFields, validateContact, type ContactFields } from "./contactValidation";

const valid: ContactFields = {
  name: "Ali",
  email: "ali@example.com",
  subject: "Hello",
  message: "This is a test message.",
};

describe("validateContact", () => {
  it("accepts valid input", () => {
    expect(validateContact(valid)).toEqual({});
  });

  it("requires every field", () => {
    const errors = validateContact({ name: "", email: "", subject: "", message: "" });
    expect(Object.keys(errors).sort()).toEqual(["email", "message", "name", "subject"]);
  });

  it("trims whitespace before checking", () => {
    expect(validateContact({ ...valid, name: "   " }).name).toBeDefined();
  });

  it("rejects invalid emails", () => {
    for (const email of ["abc", "a@b", "a b@c.com", "@c.com"]) {
      expect(validateContact({ ...valid, email }).email, email).toBe("Enter a valid email address.");
    }
  });

  it("accepts normal emails", () => {
    for (const email of ["ali@example.com", "a.b+tag@sub.example.co.uk"]) {
      expect(validateContact({ ...valid, email }).email, email).toBeUndefined();
    }
  });

  it("requires a message of at least 10 characters", () => {
    expect(validateContact({ ...valid, message: "short" }).message).toContain("at least 10");
    expect(validateContact({ ...valid, message: "1234567890" }).message).toBeUndefined();
  });

  it("rejects values over the limits", () => {
    const errors = validateContact({
      name: "a".repeat(LIMITS.name + 1),
      email: `${"a".repeat(250)}@b.co`,
      subject: "a".repeat(LIMITS.subject + 1),
      message: "a".repeat(LIMITS.message + 1),
    });
    expect(Object.keys(errors).sort()).toEqual(["email", "message", "name", "subject"]);
  });

  it("accepts values exactly at the limits", () => {
    const errors = validateContact({
      name: "a".repeat(LIMITS.name),
      email: "ali@example.com",
      subject: "a".repeat(LIMITS.subject),
      message: "a".repeat(LIMITS.message),
    });
    expect(errors).toEqual({});
  });
});

describe("serverErrorsToFields", () => {
  it("uses the first message for each known field", () => {
    expect(serverErrorsToFields({ email: ["Enter a valid email", "Another"], name: ["Name is required"] })).toEqual({
      email: "Enter a valid email",
      name: "Name is required",
    });
  });

  it("ignores unknown fields", () => {
    expect(serverErrorsToFields({ website: ["x"] })).toEqual({});
  });

  it("returns no errors when there are no details", () => {
    expect(serverErrorsToFields(undefined)).toEqual({});
  });
});