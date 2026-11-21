import { describe, expect, it } from "vitest";
import { formatDateTime, replyHref } from "./messageUtils";

describe("replyHref", () => {
  it("opens an email to the sender with Re: in front of the subject", () => {
    expect(replyHref("ali@example.com", "Hello there")).toBe("mailto:ali@example.com?subject=Re%3A%20Hello%20there");
  });
  it("does not stack Re: twice", () => {
    expect(replyHref("ali@example.com", "RE: Hello")).toBe("mailto:ali@example.com?subject=RE%3A%20Hello");
  });
  it("encodes characters that would break the link", () => {
    expect(replyHref("a+b@example.com", "Prices & plans? #1")).toBe("mailto:a%2Bb@example.com?subject=Re%3A%20Prices%20%26%20plans%3F%20%231");
  });
});

describe("formatDateTime", () => {
  it("shows a dash for a bad date", () => {
    expect(formatDateTime("nonsense")).toBe("—");
  });
  it("shows the day and the time for a good one", () => {
    expect(formatDateTime("2026-11-20T10:30:00.000Z")).toMatch(/20 Nov 2026/);
  });
});
