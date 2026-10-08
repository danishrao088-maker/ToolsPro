export type QrKind = "text" | "wifi" | "email" | "phone";
export type WifiSecurity = "WPA" | "WEP" | "nopass";

export const QR_KINDS: { value: QrKind; label: string }[] = [
  { value: "text", label: "Text or link" },
  { value: "wifi", label: "Wi-Fi network" },
  { value: "email", label: "Email" },
  { value: "phone", label: "Phone number" },
];

export const WIFI_SECURITY: { value: WifiSecurity; label: string }[] = [
  { value: "WPA", label: "WPA / WPA2 / WPA3" },
  { value: "WEP", label: "WEP" },
  { value: "nopass", label: "No password" },
];

export interface QrFields {
  kind: QrKind;
  text: string;
  ssid: string;
  password: string;
  security: WifiSecurity;
  hidden: boolean;
  emailTo: string;
  emailSubject: string;
  emailBody: string;
  phone: string;
}

export const EMPTY_FIELDS: QrFields = {
  kind: "text",
  text: "",
  ssid: "",
  password: "",
  security: "WPA",
  hidden: false,
  emailTo: "",
  emailSubject: "",
  emailBody: "",
  phone: "",
};

export type PayloadResult = { ok: true; text: string; note: string } | { ok: false; error: string };

const fail = (error: string): PayloadResult => ({ ok: false, error });
const ok = (text: string, note = ""): PayloadResult => ({ ok: true, text, note });

// Wi-Fi format mein backslash ; , : " ke aage backslash lagta hai
export function escapeWifi(value: string): string {
  return value.replace(/[\\;,:"]/g, (char) => `\\${char}`);
}

const utf8Length = (value: string) => new TextEncoder().encode(value).length;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// "example.com" ya "www.example.com/page": scheme (https://) ke baghair
const BARE_DOMAIN = /^(?:www\.|[a-z0-9-]+(?:\.[a-z0-9-]+)*\.[a-z]{2,}(?:[/?#:]|$))/i;
const HAS_SCHEME = /^[a-z][a-z0-9+.-]*:/i;

export function buildPayload(fields: QrFields): PayloadResult {
  switch (fields.kind) {
    case "text": {
      const text = fields.text.trim();
      if (text === "") return fail("Enter the text or link for your QR code.");
      const note =
        !HAS_SCHEME.test(text) && !/\s/.test(text) && BARE_DOMAIN.test(text)
          ? "This looks like a web address without https://. Many phones will show it as plain text. Add https:// at the start to make it open as a link."
          : "";
      return ok(text, note);
    }

    case "wifi": {
      const ssid = fields.ssid;
      if (ssid.trim() === "") return fail("Enter the Wi-Fi network name.");
      if (utf8Length(ssid) > 32) return fail("A Wi-Fi network name can be at most 32 bytes long.");
      let password = "";
      if (fields.security !== "nopass") {
        password = fields.password;
        if (password === "") return fail("Enter the Wi-Fi password, or choose No password.");
        if (utf8Length(password) > 63) return fail("A Wi-Fi password can be at most 63 characters long.");
      }
      const parts = [`WIFI:T:${fields.security}`, `S:${escapeWifi(ssid)}`];
      if (fields.security !== "nopass") parts.push(`P:${escapeWifi(password)}`);
      if (fields.hidden) parts.push("H:true");
      return ok(`${parts.join(";")};;`, "Anyone who scans this code can join your network, so share it only with people you trust.");
    }

    case "email": {
      const to = fields.emailTo.trim();
      if (!EMAIL.test(to)) return fail("Enter a valid email address.");
      const query: string[] = [];
      if (fields.emailSubject.trim() !== "") query.push(`subject=${encodeURIComponent(fields.emailSubject.trim())}`);
      if (fields.emailBody.trim() !== "") query.push(`body=${encodeURIComponent(fields.emailBody.trim())}`);
      return ok(`mailto:${to}${query.length > 0 ? `?${query.join("&")}` : ""}`);
    }

    case "phone": {
      const raw = fields.phone.trim();
      if (raw === "") return fail("Enter a phone number.");
      if (!/^\+?[\d\s\-().]+$/.test(raw)) return fail("A phone number can only have digits, spaces and + - ( ).");
      const digits = raw.replace(/\D/g, "");
      if (digits.length < 5 || digits.length > 15) return fail("A phone number needs 5 to 15 digits.");
      const note = raw.startsWith("+") ? "" : "Add the country code (for example +92) if people in other countries may scan this code.";
      return ok(`tel:${raw.startsWith("+") ? "+" : ""}${digits}`, note);
    }
  }
}