import { describe, expect, it } from "vitest";
import { isSpaRoute } from "../src/blog/spa";

describe("isSpaRoute", () => {
  it("accepts the React routes", () => {
    for (const p of ["/", "/tools", "/tools/", "/tools/json-formatter", "/categories", "/category/image-tools", "/about", "/contact", "/privacy", "/terms"]) {
      expect(isSpaRoute(p), p).toBe(true);
    }
  });

  it("rejects everything else so unknown URLs get a real 404 status", () => {
    for (const p of ["/nope", "/tools/a/b", "/blog", "/wp-login.php", "/about/team"]) {
      expect(isSpaRoute(p), p).toBe(false);
    }
  });
});

describe("installSpa fallback", () => {
  it("serves index.html (200 or 404) for pages but a plain 404 for missing files", async () => {
    const fs = await import("node:fs");
    const os = await import("node:os");
    const path = await import("node:path");
    const express = (await import("express")).default;
    const request = (await import("supertest")).default;
    const { installSpa } = await import("../src/blog/spa");

    const dist = fs.mkdtempSync(path.join(os.tmpdir(), "spa-"));
    fs.writeFileSync(path.join(dist, "index.html"), "<html>SPA</html>");
    const app = express();
    app.get("/api/ping", (_q, r) => void r.json({ ok: true }));
    installSpa(app, dist);

    expect((await request(app).get("/tools/json-formatter")).status).toBe(200);
    const unknown = await request(app).get("/nope");
    expect(unknown.status).toBe(404);
    expect(unknown.text).toContain("SPA");
    const missingImg = await request(app).get("/wp-content/uploads/missing.jpg");
    expect(missingImg.status).toBe(404);
    expect(missingImg.text).toBe("Not found");
    expect((await request(app).get("/api/ping")).body).toEqual({ ok: true });
  });
});
