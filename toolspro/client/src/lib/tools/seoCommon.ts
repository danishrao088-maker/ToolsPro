
export function escapeMarkup(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Line breaks aur extra spaces ko ek space bana deta hai
export function cleanText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

export function shorten(text: string, max = 40): string {
  return text.length > max ? `${text.slice(0, max)}...` : text;
}

export type UrlCheck = { ok: true; href: string } | { ok: false; error: string };

// Sirf http aur https, bina username/password ke. Nateeja normalize hota hai (host chhota, "/" jora hua).
export function checkHttpUrl(value: string, label: string): UrlCheck {
  const error = `${label} must be a full web address that starts with http:// or https://.`;
  const trimmed = value.trim();
  if (trimmed === "" || /\s/.test(trimmed)) return { ok: false, error };

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return { ok: false, error };
  }

  const safeProtocol = url.protocol === "http:" || url.protocol === "https:";
  if (!safeProtocol || url.username !== "" || url.password !== "") return { ok: false, error };
  return { ok: true, href: url.href };
}

export function advisory(label: string, length: number, limit: number, where: string): string | null {
  return length > limit
    ? `${label} is ${length} characters, and text over about ${limit} may be cut off in ${where}.`
    : null;
}

export function joinNotes(notes: (string | null)[]): string {
  return notes.filter((note): note is string => note !== null).join(" ");
}