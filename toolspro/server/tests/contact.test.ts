import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../src/services/contactService", () => ({
  saveContactMessage: vi.fn(),
}));

import { app } from "../src/app";
import { saveContactMessage } from "../src/services/contactService";

const mockedSave = vi.mocked(saveContactMessage);

const validBody = {
  name: "Ali",
  email: "ali@example.com",
  subject: "Hello",
  message: "This is a test message.",
};

describe("POST /api/contact", () => {
  beforeEach(() => {
    mockedSave.mockReset();
    mockedSave.mockResolvedValue(undefined);
  });

  it("saves a valid message and confirms", async () => {
    const res = await request(app).post("/api/contact").send(validBody);
    expect(res.status).toBe(201);
    expect(res.body).toEqual({ success: true, data: { received: true } });
    expect(mockedSave).toHaveBeenCalledWith(validBody);
  });

  it("rejects invalid data with per-field details", async () => {
    const res = await request(app)
      .post("/api/contact")
      .send({ name: "", email: "abc", subject: "Hi", message: "short" });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
    expect(Object.keys(res.body.error.details)).toEqual(
      expect.arrayContaining(["name", "email", "message"])
    );
    expect(mockedSave).not.toHaveBeenCalled();
  });

  it("silently ignores honeypot submissions", async () => {
    const res = await request(app)
      .post("/api/contact")
      .send({ ...validBody, website: "http://spam.example" });
    expect(res.status).toBe(201);
    expect(mockedSave).not.toHaveBeenCalled();
  });

  it("rejects malformed JSON", async () => {
    const res = await request(app)
      .post("/api/contact")
      .set("Content-Type", "application/json")
      .send("{not valid json");
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("INVALID_JSON");
  });

  it("rejects oversized bodies", async () => {
    const res = await request(app)
      .post("/api/contact")
      .send({ ...validBody, message: "x".repeat(20_000) });
    expect(res.status).toBe(413);
    expect(res.body.error.code).toBe("PAYLOAD_TOO_LARGE");
  });
});