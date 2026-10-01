export interface NavItem {
  label: string;
  path: string;
}

export const mainLinks: NavItem[] = [
  { label: "Home", path: "/" },
  { label: "All Tools", path: "/tools" },
  { label: "Categories", path: "/categories" },
  { label: "About", path: "/about" },
  { label: "Contact", path: "/contact" },
];

export const legalLinks: NavItem[] = [
  { label: "Privacy Policy", path: "/privacy" },
  { label: "Terms of Service", path: "/terms" },
];