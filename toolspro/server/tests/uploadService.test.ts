import express from "express";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { createUploadHandler, uploadBody } from "../src/controllers/adminUploadController";
import { errorHandler } from "../src/middleware/errorHandler";
import { MAX_UPLOAD_BYTES, createUploadService, detectImage, safeBaseName } from "../src/services/uploadService";

const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(32)]);
const JPG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(32)]);
const GIF = Buffer.concat([Buffer.from("GIF89a", "latin1"), Buffer.alloc(32)]);
const WEBP = Buffer.concat([Buffer.from("RIFF", "latin1"), Buffer.alloc(4), Buffer.from("WEBP", "latin1"), Buffer.alloc(32)]);

const tempDir = () => fs.mkdtempSync(path.join(os.tmpdir(), "uploads-"));
const NOW = new Date("2026-11-20T10:00:00.000Z");

describe("detectImage", () => {
  it("recognises the four allowed formats by their first bytes", () => {
    expect(detectImage(PNG)?.ext).toBe("png");
    expect(detectImage(JPG)?.ext).toBe("jpg");
    expect(detectImage(GIF)?.ext).toBe("gif");
    expect(detectImage(WEBP)?.ext).toBe("webp");
  });
  it("refuses SVG, HTML, scripts, empty and short data", () => {
    for (const text of ['<svg xmlns="http://www.w3.org/2000/svg"></svg>', "<html></html>", "<script>alert(1)</script>", "GIF", ""]) {
      expect(detectImage(Buffer.from(text)), text).toBeNull();
    }
    expect(detectImage(Buffer.from("RIFF0000WAVE", "latin1"))).toBeNull();
  });
});

describe("safeBaseName", () => {
  it("makes a clean lowercase name and drops the extension and folders", () => {
    expect(safeBaseName("My Photo (1).JPG")).toBe("my-photo-1");
    expect(safeBaseName("C:\\Users\\Hp\\Pictures\\Cover Image.png")).toBe("cover-image");
    expect(safeBaseName("../../etc/passwd")).toBe("passwd");
  });
  it("falls back to 'image' and keeps names short", () => {
    expect(safeBaseName("")).toBe("image");
    expect(safeBaseName("\u0627\u0631\u062f\u0648.png")).toBe("image");
    expect(safeBaseName(`${"a".repeat(200)}.png`).length).toBeLessThanOrEqual(60);
  });
});

describe("createUploadService", () => {
  it("saves into year/month with the right extension and returns the public address", async () => {
    const dir = tempDir();
    const service = createUploadService({ dir, now: () => NOW });
    const saved = await service.save(PNG, "Hello World.jpeg"); // naam jhoota extension de to bhi asli type chalta hai
    expect(saved).toEqual({ url: "/wp-content/uploads/2026/11/hello-world.png", bytes: PNG.length, type: "image/png" });
    expect(fs.readFileSync(path.join(dir, "2026", "11", "hello-world.png")).equals(PNG)).toBe(true);
  });
  it("never overwrites an existing picture", async () => {
    const dir = tempDir();
    const service = createUploadService({ dir, now: () => NOW });
    const first = await service.save(JPG, "photo.jpg");
    const second = await service.save(JPG, "photo.jpg");
    const third = await service.save(JPG, "photo.jpg");
    expect([first.url, second.url, third.url]).toEqual([
      "/wp-content/uploads/2026/11/photo.jpg",
      "/wp-content/uploads/2026/11/photo-2.jpg",
      "/wp-content/uploads/2026/11/photo-3.jpg",
    ]);
  });
  it("refuses data that is not a real picture, even with an image name", async () => {
    const service = createUploadService({ dir: tempDir(), now: () => NOW });
    await expect(service.save(Buffer.from("<svg></svg>"), "logo.png")).rejects.toMatchObject({ code: "VALIDATION_ERROR", statusCode: 400 });
    await expect(service.save(Buffer.alloc(0), "x.png")).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });
  it("refuses a picture over the size limit", async () => {
    const service = createUploadService({ dir: tempDir(), now: () => NOW });
    const big = Buffer.concat([PNG, Buffer.alloc(MAX_UPLOAD_BYTES)]);
    await expect(service.save(big, "big.png")).rejects.toMatchObject({ statusCode: 413 });
  });
  it("says so when uploads are not configured", async () => {
    const service = createUploadService({ dir: "" });
    await expect(service.save(PNG, "a.png")).rejects.toMatchObject({ statusCode: 503, code: "UPLOADS_NOT_CONFIGURED" });
  });
});

describe("POST upload handler", () => {
  function makeApp() {
    const dir = tempDir();
    const app = express();
    app.post("/up", uploadBody, createUploadHandler(createUploadService({ dir, now: () => NOW })));
    app.use(errorHandler);
    return { app, dir };
  }

  it("stores the picture and answers 201 with the address", async () => {
    const { app, dir } = makeApp();
    const res = await request(app).post("/up").set("Content-Type", "image/png").set("X-File-Name", encodeURIComponent("Mera Photo.png")).send(PNG);
    expect(res.status).toBe(201);
    expect(res.body).toEqual({ success: true, data: { url: "/wp-content/uploads/2026/11/mera-photo.png", bytes: PNG.length, type: "image/png" } });
    expect(fs.existsSync(path.join(dir, "2026", "11", "mera-photo.png"))).toBe(true);
  });
  it("works without a file name header and with a broken one", async () => {
    const { app } = makeApp();
    expect((await request(app).post("/up").set("Content-Type", "image/webp").send(WEBP)).body.data.url).toBe("/wp-content/uploads/2026/11/image.webp");
    expect((await request(app).post("/up").set("Content-Type", "image/gif").set("X-File-Name", "%E0%A4%A").send(GIF)).status).toBe(201);
  });
  it("refuses other content types with 415", async () => {
    const { app } = makeApp();
    expect((await request(app).post("/up").set("Content-Type", "image/svg+xml").send("<svg/>")).status).toBe(415);
    expect((await request(app).post("/up").set("Content-Type", "application/json").send({ a: 1 })).status).toBe(415);
    expect((await request(app).post("/up")).status).toBe(415);
  });
  it("refuses a fake picture that only claims to be an image", async () => {
    const { app } = makeApp();
    const res = await request(app).post("/up").set("Content-Type", "image/png").send(Buffer.from("<script>alert(1)</script>"));
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });
  it("answers 413 when the body is too large", async () => {
    const { app } = makeApp();
    const res = await request(app).post("/up").set("Content-Type", "image/png").send(Buffer.concat([PNG, Buffer.alloc(MAX_UPLOAD_BYTES + 10)]));
    expect(res.status).toBe(413);
  });
});
