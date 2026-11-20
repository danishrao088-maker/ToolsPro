// "Reply" button ke liye email ka link (mailto:). Email aur subject dono ko encode karte hain taake kuch bhi link ko tor na sake.
export function replyHref(email: string, subject: string): string {
  const to = encodeURIComponent(email.trim()).replace(/%40/g, "@");
  const trimmed = subject.trim();
  const re = /^re:/i.test(trimmed) ? trimmed : `Re: ${trimmed}`;
  return `mailto:${to}?subject=${encodeURIComponent(re)}`;
}

export function formatDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}
