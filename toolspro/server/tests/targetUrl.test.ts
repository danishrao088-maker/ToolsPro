import { describe, expect, it } from "vitest";
import { parseTargetUrl } from "../src/utils/targetUrl";
import { AppError } from "../src/utils/AppError";

function codeOf(input: string, ports?: number[] | "any"): string {
  try {
    parseTargetUrl(input, ports);
    return "ok";
  } catch (error) {
    if (error instanceof AppError) return error.code;
    throw error;
  }
}

describe("parseTargetUrl", () => {
  it("adds https and removes the fragment", () => {
    expect(parseTargetUrl("example.com").href).toBe("https://example.com/");
    expect(parseTargetUrl("  http://Example.com/a?b=1#top ").href).toBe("http://example.com/a?b=1");
    expect(parseTargetUrl("https://sub.example.co.uk:8443/x").port).toBe("8443");
  });

  it("rejects empty, long and spaced input", () => {
    expect(codeOf("")).toBe("INVALID_URL");
    expect(codeOf("   ")).toBe("INVALID_URL");
    expect(codeOf("a".repeat(2050) + ".com")).toBe("INVALID_URL");
    expect(codeOf("exa mple.com")).toBe("INVALID_URL");
    expect(codeOf("example.com\nhttp://evil.com")).toBe("INVALID_URL");
  });

  it("rejects other schemes and credentials", () => {
    for (const bad of ["ftp://example.com", "file:///etc/passwd", "gopher://example.com", "javascript:alert(1)", "data:text/html,hi", "mailto:a@example.com"]) {
      expect(codeOf(bad), bad).not.toBe("ok");
    }
    expect(codeOf("https://user:pass@example.com")).toBe("INVALID_URL");
    expect(codeOf("https://user@example.com")).toBe("INVALID_URL");
  });

  it("blocks local and private targets", () => {
    for (const bad of [
      "localhost", "http://localhost/", "http://LOCALHOST./", "foo.localhost", "printer.local", "db.internal", "nas.lan", "router.home.arpa",
      "http://127.0.0.1/", "http://10.1.2.3/", "http://169.254.169.254/latest/meta-data", "http://192.168.0.1/",
      "http://[::1]/", "http://[::ffff:127.0.0.1]/", "http://[fe80::1]/", "http://0.0.0.0/",
      "http://2130706433/", "http://0x7f.0.0.1/", "http://017700000001/", "http://127.1/",
    ]) {
      expect(codeOf(bad), bad).toBe("URL_NOT_ALLOWED");
    }
  });

  it("asks for a full domain name", () => {
    expect(codeOf("intranet")).toBe("INVALID_URL");
    expect(codeOf("http://server/")).toBe("INVALID_URL");
  });

  it("allows only normal ports unless told otherwise", () => {
    expect(codeOf("example.com:8080")).toBe("ok");
    expect(codeOf("http://example.com:80")).toBe("ok");
    expect(codeOf("example.com:22")).toBe("INVALID_URL");
    expect(codeOf("example.com:6379")).toBe("INVALID_URL");
    expect(codeOf("example.com:6379", "any")).toBe("ok");
  });

  it("allows public IP addresses", () => {
    expect(codeOf("http://8.8.8.8/")).toBe("ok");
    expect(codeOf("http://[2606:4700:4700::1111]/")).toBe("ok");
  });
});
