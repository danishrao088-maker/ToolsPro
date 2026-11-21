import request from "supertest";
import { describe, expect, it } from "vitest";
import { app } from "../src/app";

// Image to Text (OCR) browser mein WebAssembly aur ek worker chalata hai. CSP in dono ko rokti thi, is liye tool
// "The text could not be read" dikhata tha. Ye test ensure karta hai ke ye ijazat bani rahe aur baqi CSP sakht rahe.
describe("React app Content-Security-Policy", () => {
  async function csp(): Promise<Map<string, string>> {
    const res = await request(app).get("/api/health");
    const header = String(res.headers["content-security-policy"] ?? "");
    return new Map(
      header
        .split(";")
        .map((part) => part.trim())
        .filter(Boolean)
        .map((part) => {
          const [name = "", ...rest] = part.split(/\s+/);
          return [name, rest.join(" ")] as [string, string];
        }),
    );
  }

  it("lets the OCR tool run WebAssembly and load its own worker", async () => {
    const directives = await csp();
    expect(directives.get("script-src")).toBe("'self' 'wasm-unsafe-eval'");
    expect(directives.get("worker-src")).toBe("'self'");
  });

  it("stays strict otherwise: no eval, no blob workers, no inline or remote scripts", async () => {
    const directives = await csp();
    const scriptSrc = directives.get("script-src") ?? "";
    expect(scriptSrc).not.toContain("'unsafe-eval'");
    expect(scriptSrc).not.toContain("'unsafe-inline'");
    expect(scriptSrc).not.toContain("https:");
    expect(directives.get("worker-src")).not.toContain("blob:");
    expect(directives.get("default-src")).toBe("'self'");
    expect(directives.get("object-src")).toBe("'none'");
  });
});
