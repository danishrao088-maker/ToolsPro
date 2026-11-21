// Yeh paths ToolsPro (React app, API, files) ke hain. Blog inhe kabhi nahi chhoti.
// Agar WordPress ke kisi post/page ka slug inme se ho to wo URL React app ka hi rahega.
export const RESERVED_SLUGS = new Set([
  "api",
  "s",
  "tools",
  "categories",
  "category",
  "tag",
  "author",
  "page",
  "blog",
  "admin",
  "about",
  "contact",
  "privacy",
  "terms",
  "feed",
  "rss",
  "assets",
  "uploads",
  "wp-content",
  "wp-admin",
  "wp-json",
  "wp-includes",
  "wp-login.php",
  "xmlrpc.php",
  "sitemap.xml",
  "rss.xml",
  "robots.txt",
  "favicon.ico",
  "index.html",
]);

// Purane WordPress pages jinke React app mein barabar ke pages pehle se hain.
// Inpar 301 redirect lagta hai. Is list ko apni zaroorat ke mutabiq badal sakte hain.
export const LEGACY_REDIRECTS: Record<string, string> = {
  "contact-us": "/contact",
  "privacy-policy": "/privacy",
  "terms-and-conditions": "/terms",
};
