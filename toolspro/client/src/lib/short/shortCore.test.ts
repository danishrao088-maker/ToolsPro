import { describe, expect, it } from "vitest";
import { MAX_ADDRESS_LENGTH, shortLinkUrl } from "./shortCore";

describe("shortLinkUrl", () => {
  it("joins the site address and the path", () => {
    expect(shortLinkUrl("https://toolspro.com", "/s/abcd234")).toBe("https://toolspro.com/s/abcd234");
    expect(shortLinkUrl("http://localhost:5173", "/s/abcd234")).toBe("http://localhost:5173/s/abcd234");
  });
  it("copes with a trailing slash or a missing one", () => {
    expect(shortLinkUrl("https://toolspro.com/", "/s/abcd234")).toBe("https://toolspro.com/s/abcd234");
    expect(shortLinkUrl("https://toolspro.com", "s/abcd234")).toBe("https://toolspro.com/s/abcd234");
  });
  it("uses the same address limit as the server", () => {
    expect(MAX_ADDRESS_LENGTH).toBe(2048);
  });
});