import { escapeHtml } from "./content";

// Blog pages ka header aur footer. Ye React app (client/src/components/layout/Header.tsx aur Footer.tsx) ka
// jyun ka tyun HTML copy hai, taake /tools aur /blog/ ek hi website lagein.
//
// ZAROORI: Agar React mein menu ke links badlein (client/src/data/navigation.ts) to neeche ki dono lists
// bhi badal dein. tests/blogChrome.test.ts dono ko milata hai aur fark par fail hota hai.

export interface NavLink {
  label: string;
  path: string;
}

export const MAIN_LINKS: NavLink[] = [
  { label: "Home", path: "/" },
  { label: "All Tools", path: "/tools" },
  { label: "Categories", path: "/categories" },
  { label: "Blog", path: "/blog/" },
  { label: "About", path: "/about" },
  { label: "Contact", path: "/contact" },
];

export const LEGAL_LINKS: NavLink[] = [
  { label: "Privacy Policy", path: "/privacy" },
  { label: "Terms of Service", path: "/terms" },
];

// Blog ke saare pages "Blog" section mein hain, isliye menu mein wohi highlight hota hai
const ACTIVE_PATH = "/blog/";

// ---- Icons (lucide, React wale ke barabar) ----
const SVG_ATTRS = 'xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"';
const ICON_SEARCH = `<svg ${SVG_ATTRS} width="20" height="20"><path d="m21 21-4.34-4.34"/><circle cx="11" cy="11" r="8"/></svg>`;
const ICON_MOON = `<svg ${SVG_ATTRS} width="20" height="20"><path d="M20.985 12.486a9 9 0 1 1-9.473-9.472c.405-.022.617.46.402.803a6 6 0 0 0 8.268 8.268c.344-.215.825-.004.803.401"/></svg>`;
const ICON_SUN = `<svg ${SVG_ATTRS} width="20" height="20"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>`;
const ICON_MENU = `<svg ${SVG_ATTRS} width="22" height="22"><path d="M4 5h16"/><path d="M4 12h16"/><path d="M4 19h16"/></svg>`;
const ICON_CLOSE = `<svg ${SVG_ATTRS} width="22" height="22"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>`;

// Site ka naam: client/src/data/site.ts ke SITE_NAME_PARTS ke barabar rehna chahiye (blogChrome.test.ts check karta hai)
export const BRAND_PARTS = ["Thesource", "Full"] as const;
const BRAND_NAME = BRAND_PARTS.join(" ");

function logo(gradientId: string): string {
  return `<span class="logo"><svg width="32" height="32" viewBox="0 0 32 32" aria-hidden="true" focusable="false"><defs><linearGradient id="${gradientId}" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse"><stop stop-color="#5B35F5"/><stop offset="1" stop-color="#3B82F6"/></linearGradient></defs><rect width="32" height="32" rx="8" fill="url(#${gradientId})"/><rect x="8" y="9" width="16" height="4" rx="2" fill="#fff"/><rect x="14" y="9" width="4" height="15" rx="2" fill="#fff"/></svg><span class="logo-text">${BRAND_PARTS[0]} <span>${BRAND_PARTS[1]}</span></span></span>`;
}

function link(item: NavLink, className: string): string {
  const active = item.path === ACTIVE_PATH ? " is-active" : "";
  return `<a href="${escapeHtml(item.path)}" class="${className}${active}">${escapeHtml(item.label)}</a>`;
}

// Footer ke links highlight nahi hote (React Footer jaisa)
function plainLink(item: NavLink): string {
  return `<a href="${escapeHtml(item.path)}">${escapeHtml(item.label)}</a>`;
}

export function siteHeader(): string {
  const desktop = MAIN_LINKS.map((item) => link(item, "nav-link")).join("");
  const mobile = [...MAIN_LINKS, ...LEGAL_LINKS].map((item) => `<li>${link(item, "m-link")}</li>`).join("");
  return `<a class="skip-link" href="#main-content">Skip to main content</a>
<header class="site-header">
<div class="container site-header__bar">
<a href="/" class="logo-link">${logo("toolspro-logo-header")}</a>
<nav aria-label="Main" class="main-nav">${desktop}</nav>
<div class="header-actions">
<a href="/tools" aria-label="Search tools" class="icon-btn">${ICON_SEARCH}</a>
<button type="button" id="theme-toggle" class="icon-btn" aria-label="Switch to dark theme"><span class="icon-moon">${ICON_MOON}</span><span class="icon-sun">${ICON_SUN}</span></button>
<button type="button" id="menu-toggle" class="icon-btn menu-btn" aria-expanded="false" aria-controls="mobile-menu" aria-label="Open menu"><span class="icon-open">${ICON_MENU}</span><span class="icon-close">${ICON_CLOSE}</span></button>
</div>
</div>
<nav id="mobile-menu" aria-label="Mobile" class="mobile-menu" hidden><ul>${mobile}</ul></nav>
</header>`;
}

export function siteFooter(year: number): string {
  const main = MAIN_LINKS.map((item) => `<li>${plainLink(item)}</li>`).join("");
  const legal = LEGAL_LINKS.map((item) => `<li>${plainLink(item)}</li>`).join("");
  return `<footer class="site-footer">
<div class="container site-footer__inner">
<div class="footer-grid">
<div><a href="/" class="logo-link">${logo("toolspro-logo-footer")}</a><p class="footer-tagline">Simple, powerful tools to make your everyday work easier.</p></div>
<nav aria-label="Footer"><h2>Navigation</h2><ul>${main}</ul></nav>
<nav aria-label="Legal"><h2>Legal</h2><ul>${legal}</ul></nav>
</div>
<p class="footer-copy">&copy; ${year} ${escapeHtml(BRAND_NAME)}. All rights reserved.</p>
</div>
</footer>`;
}

// Inter font: React app jaisa hi (client/public/fonts mein latin aur latin-ext, taake hashed file naam par depend na karein)
export const FONT_CSS = `
@font-face{font-family:"Inter Variable";font-style:normal;font-display:swap;font-weight:100 900;src:url(/fonts/inter-latin-ext.woff2) format("woff2-variations");unicode-range:U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF}
@font-face{font-family:"Inter Variable";font-style:normal;font-display:swap;font-weight:100 900;src:url(/fonts/inter-latin.woff2) format("woff2-variations");unicode-range:U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD}
`;

// Rang, header aur footer ki styling (client/src/index.css aur Tailwind classes ke barabar)
export const CHROME_CSS = `
:root{--page:#f7f8fc;--surface:#fff;--surface-muted:#f1f3fa;--heading:#171b32;--body:#626b82;--muted:#8a92a6;--line:#e6e9f2;--link:#5b35f5;--primary:#5b35f5;--focus:#6b55f7;color-scheme:light}
.dark{--page:#0c1124;--surface:#131a35;--surface-muted:#1a2245;--heading:#f1f3ff;--body:#aeb6cf;--muted:#7f88a3;--line:#28315a;--link:#a99bff;color-scheme:dark}
*,::before,::after{box-sizing:border-box}
html{-webkit-text-size-adjust:100%}
body{margin:0;min-height:100vh;display:flex;flex-direction:column;font:17px/1.7 "Inter Variable",system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:var(--body);background:var(--page)}
:focus-visible{outline:2px solid var(--focus);outline-offset:2px}
.container{width:100%;max-width:1280px;margin:0 auto;padding:0 16px}
@media(min-width:640px){.container{padding:0 24px}}
@media(min-width:1024px){.container{padding:0 32px}}
.skip-link{position:absolute;width:1px;height:1px;margin:-1px;padding:0;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
.skip-link:focus{position:fixed;left:16px;top:16px;z-index:50;width:auto;height:auto;margin:0;overflow:visible;clip:auto;border-radius:8px;background:var(--primary);padding:8px 16px;color:#fff;text-decoration:none}
.logo-link{display:inline-block;border-radius:6px;color:inherit;text-decoration:none}
.logo{display:inline-flex;align-items:center;gap:8px}
.logo svg{display:block}
.logo-text{white-space:nowrap;font-size:20px;line-height:28px;font-weight:700;letter-spacing:-.025em;color:var(--heading)}
.logo-text span{color:var(--link)}
@media (max-width:359px){.logo{gap:6px}.logo svg{width:28px;height:28px}.logo-text{font-size:16px}}
.site-header{position:sticky;top:0;z-index:40;border-bottom:1px solid var(--line);background:var(--surface)}
.site-header__bar{display:flex;height:64px;align-items:center;justify-content:space-between;gap:16px}
.main-nav{display:none;align-items:center;gap:4px}
@media(min-width:768px){.main-nav{display:flex}}
.nav-link{border-radius:8px;padding:8px 12px;font-size:14px;line-height:20px;font-weight:500;color:var(--body);text-decoration:none;transition:background-color .15s,color .15s}
.nav-link:hover{background:var(--surface-muted);color:var(--heading)}
.nav-link.is-active{background:var(--surface-muted);color:var(--link)}
.header-actions{display:flex;align-items:center;gap:4px}
.icon-btn{display:inline-flex;width:44px;height:44px;align-items:center;justify-content:center;margin:0;padding:0;border:0;border-radius:8px;background:transparent;color:var(--body);font:inherit;cursor:pointer;text-decoration:none;transition:background-color .15s,color .15s}
.icon-btn:hover{background:var(--surface-muted);color:var(--heading)}
.icon-btn span{display:inline-flex}
.icon-btn svg{display:block}
.icon-sun,.menu-btn .icon-close{display:none!important}
.dark .icon-sun{display:inline-flex!important}
.dark .icon-moon{display:none!important}
.menu-btn.is-open .icon-close{display:inline-flex!important}
.menu-btn.is-open .icon-open{display:none!important}
@media(min-width:768px){.menu-btn{display:none}}
.mobile-menu{position:fixed;left:0;right:0;bottom:0;top:64px;overflow-y:auto;border-top:1px solid var(--line);background:var(--surface);padding:16px}
.mobile-menu[hidden]{display:none}
@media(min-width:768px){.mobile-menu{display:none}}
.mobile-menu ul{display:flex;flex-direction:column;gap:4px;margin:0;padding:0;list-style:none}
.m-link{display:block;border-radius:8px;padding:12px 16px;font-size:16px;line-height:24px;font-weight:500;color:var(--heading);text-decoration:none}
.m-link:hover{background:var(--surface-muted)}
.m-link.is-active{background:var(--surface-muted);color:var(--link)}
.site-header,.site-footer{font-size:16px;line-height:24px}
.site-footer{border-top:1px solid var(--line);background:var(--surface-muted);color:var(--body)}
.site-footer__inner{padding-top:40px;padding-bottom:40px}
.footer-grid{display:grid;grid-template-columns:minmax(0,1fr);gap:32px}
@media(min-width:640px){.footer-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(min-width:1024px){.footer-grid{grid-template-columns:repeat(3,minmax(0,1fr))}}
.footer-tagline{margin:12px 0 0;max-width:384px;font-size:14px;line-height:20px}
.site-footer h2{margin:0;font-size:14px;line-height:20px;font-weight:600;color:var(--heading)}
.site-footer ul{margin:12px 0 0;padding:0;list-style:none}
.site-footer li+li{margin-top:8px}
.site-footer ul a{font-size:14px;line-height:20px;color:var(--body);text-decoration:none;transition:color .15s}
.site-footer ul a:hover{color:var(--link)}
.footer-copy{margin:32px 0 0;padding-top:24px;border-top:1px solid var(--line);font-size:14px;line-height:20px}
`;
