import { describe, expect, it } from "vitest";
import { EMPTY_FIELDS, buildPayload, escapeWifi, type PayloadResult, type QrFields } from "./qrPayload";

const fields = (patch: Partial<QrFields>): QrFields => ({ ...EMPTY_FIELDS, ...patch });

function text(result: PayloadResult): string {
  if (!result.ok) throw new Error(`Expected success but got: ${result.error}`);
  return result.text;
}

function error(result: PayloadResult): string {
  if (result.ok) throw new Error(`Expected an error but got: ${result.text}`);
  return result.error;
}

describe("text or link", () => {
  it("trims the text and keeps it as it is", () => {
    expect(text(buildPayload(fields({ text: "  https://example.com/a?b=1&c=2  " })))).toBe("https://example.com/a?b=1&c=2");
  });

  it("keeps line breaks inside the text", () => {
    expect(text(buildPayload(fields({ text: "line 1\nline 2" })))).toBe("line 1\nline 2");
  });

  it("requires text", () => {
    expect(error(buildPayload(fields({ text: "   " })))).toContain("Enter");
  });

  it("adds a note for a web address without https://", () => {
    for (const value of ["example.com", "www.example.com/page", "my-site.co.uk/a?b=1"]) {
      const result = buildPayload(fields({ text: value }));
      expect(result.ok && result.note, value).toContain("https://");
    }
  });

  it("adds no note for links with a scheme, plain words or sentences", () => {
    for (const value of ["https://example.com", "mailto:a@b.co", "hello world", "just text", "Visit example.com today"]) {
      const result = buildPayload(fields({ text: value }));
      expect(result.ok && result.note, value).toBe("");
    }
  });
});

describe("Wi-Fi", () => {
  it("builds a WPA network", () => {
    expect(text(buildPayload(fields({ kind: "wifi", ssid: "Home", password: "secret123" })))).toBe("WIFI:T:WPA;S:Home;P:secret123;;");
  });

  it("marks a hidden network", () => {
    expect(text(buildPayload(fields({ kind: "wifi", ssid: "Home", password: "x", hidden: true })))).toBe("WIFI:T:WPA;S:Home;P:x;H:true;;");
  });

  it("leaves out the password when there is none, even if one was typed earlier", () => {
    expect(text(buildPayload(fields({ kind: "wifi", ssid: "Cafe", password: "old", security: "nopass" })))).toBe("WIFI:T:nopass;S:Cafe;;");
  });

  it("escapes special characters", () => {
    expect(escapeWifi(String.raw`a;b,c:d"e\f`)).toBe(String.raw`a\;b\,c\:d\"e\\f`);
    expect(text(buildPayload(fields({ kind: "wifi", ssid: "My;Net", password: "pa:ss" })))).toBe(String.raw`WIFI:T:WPA;S:My\;Net;P:pa\:ss;;`);
  });

  it("warns about sharing", () => {
    const result = buildPayload(fields({ kind: "wifi", ssid: "Home", password: "x" }));
    expect(result.ok && result.note).toContain("join your network");
  });

  it("checks the name and password", () => {
    expect(error(buildPayload(fields({ kind: "wifi", ssid: " ", password: "x" })))).toContain("network name");
    expect(error(buildPayload(fields({ kind: "wifi", ssid: "a".repeat(33), password: "x" })))).toContain("32");
    expect(error(buildPayload(fields({ kind: "wifi", ssid: "Home", password: "" })))).toContain("password");
    expect(error(buildPayload(fields({ kind: "wifi", ssid: "Home", password: "a".repeat(64) })))).toContain("63");
  });
});

describe("email", () => {
  it("builds a plain address", () => {
    expect(text(buildPayload(fields({ kind: "email", emailTo: " ali@example.com " })))).toBe("mailto:ali@example.com");
  });

  it("encodes the subject and body", () => {
    expect(
      text(buildPayload(fields({ kind: "email", emailTo: "a@b.co", emailSubject: "Hi & bye", emailBody: "Line 1\nLine 2" })))
    ).toBe("mailto:a@b.co?subject=Hi%20%26%20bye&body=Line%201%0ALine%202");
  });

  it("skips empty parts and rejects invalid addresses", () => {
    expect(text(buildPayload(fields({ kind: "email", emailTo: "a@b.co", emailBody: "x" })))).toBe("mailto:a@b.co?body=x");
    for (const bad of ["", "no-at-sign", "a@b", "a b@c.co"]) {
      expect(error(buildPayload(fields({ kind: "email", emailTo: bad }))), bad).toContain("email");
    }
  });
});

describe("phone", () => {
  it("keeps only digits and a leading +", () => {
    expect(text(buildPayload(fields({ kind: "phone", phone: "+92 300 123-4567" })))).toBe("tel:+923001234567");
    expect(text(buildPayload(fields({ kind: "phone", phone: "(021) 3456 7890" })))).toBe("tel:02134567890");
  });

  it("suggests a country code when there is no +", () => {
    const withCode = buildPayload(fields({ kind: "phone", phone: "+923001234567" }));
    const without = buildPayload(fields({ kind: "phone", phone: "03001234567" }));
    expect(withCode.ok && withCode.note).toBe("");
    expect(without.ok && without.note).toContain("country code");
  });

  it("rejects letters and numbers of the wrong length", () => {
    expect(error(buildPayload(fields({ kind: "phone", phone: "0300-ABC" })))).toContain("digits");
    expect(error(buildPayload(fields({ kind: "phone", phone: "1234" })))).toContain("5 to 15");
    expect(error(buildPayload(fields({ kind: "phone", phone: "1".repeat(16) })))).toContain("5 to 15");
    expect(error(buildPayload(fields({ kind: "phone", phone: "" })))).toContain("Enter");
  });
});