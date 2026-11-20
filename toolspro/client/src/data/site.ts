export const LEGAL_LAST_UPDATED = "4 October 2026";
export const CONTACT_RETENTION_DAYS = 90;
// Site ka naam: logo, footer, page titles aur admin sab yahin se lete hain. Naam badalna ho to sirf yeh do lafz badlo.
// (Blog ka header/footer server/src/blog/chrome.ts mein hai; server/tests/blogChrome.test.ts dono ko barabar rakhta hai.)
export const SITE_NAME_PARTS = ["Thesource", "Full"] as const;
export const SITE_NAME = SITE_NAME_PARTS.join(" ");
