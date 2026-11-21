export interface NavItem {
  label: string;
  path: string;
  // true: ye React ka page nahi, server ka page hai (jaise /blog/). Isliye router ki jagah seedha <a> se poora page load hota hai.
  serverPage?: boolean;
}

export const mainLinks: NavItem[] = [
  { label: "Home", path: "/" },
  { label: "All Tools", path: "/tools" },
  { label: "Categories", path: "/categories" },
  { label: "Blog", path: "/blog/", serverPage: true },
  { label: "About", path: "/about" },
  { label: "Contact", path: "/contact" },
];

export const legalLinks: NavItem[] = [
  { label: "Privacy Policy", path: "/privacy" },
  { label: "Terms of Service", path: "/terms" },
];