import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { Menu, Moon, Search, Sun, X } from "lucide-react";
import { Container } from "../common/Container";
import { Logo } from "../common/Logo";
import { useTheme } from "../../hooks/useTheme";
import { legalLinks, mainLinks } from "../../data/navigation";

const iconButtonClass =
  "inline-flex h-11 w-11 items-center justify-center rounded-lg text-body transition-colors hover:bg-surface-muted hover:text-heading";

const desktopLinkClass = ({ isActive }: { isActive: boolean }) =>
  `rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
    isActive ? "bg-surface-muted text-link" : "text-body hover:bg-surface-muted hover:text-heading"
  }`;

const mobileLinkClass = ({ isActive }: { isActive: boolean }) =>
  `block rounded-lg px-4 py-3 text-base font-medium ${
    isActive ? "bg-surface-muted text-link" : "text-heading hover:bg-surface-muted"
  }`;

export function Header() {
  const { theme, toggle } = useTheme();
  const { pathname } = useLocation();

  // Menu "khula" tab hai jab uska khulne wala path maujooda path ke barabar ho.
  // Page badalte hi ye barabar nahi rehta, to menu khud band ho jata hai.
  const [openPath, setOpenPath] = useState<string | null>(null);
  const open = openPath === pathname;

  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const firstLinkRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    if (!open) return;

    firstLinkRef.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpenPath(null);
        menuButtonRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const onChange = (e: MediaQueryListEvent) => {
      if (e.matches) setOpenPath(null);
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-surface">
      <Container className="flex h-16 items-center justify-between gap-4">
        <Link to="/" className="rounded-md">
          <Logo />
        </Link>

        <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
          {mainLinks.map((item) => (
            <NavLink key={item.path} to={item.path} end={item.path === "/"} className={desktopLinkClass}>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-1">
          <Link to="/tools" aria-label="Search tools" className={iconButtonClass}>
            <Search aria-hidden="true" size={20} />
          </Link>

          <button
            type="button"
            onClick={toggle}
            aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
            className={iconButtonClass}
          >
            {theme === "dark" ? <Sun aria-hidden="true" size={20} /> : <Moon aria-hidden="true" size={20} />}
          </button>

          <button
            ref={menuButtonRef}
            type="button"
            onClick={() => setOpenPath(open ? null : pathname)}
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={open ? "Close menu" : "Open menu"}
            className={`${iconButtonClass} md:hidden`}
          >
            {open ? <X aria-hidden="true" size={22} /> : <Menu aria-hidden="true" size={22} />}
          </button>
        </div>
      </Container>

      <nav
        id="mobile-menu"
        aria-label="Mobile"
        hidden={!open}
        className="fixed inset-x-0 bottom-0 top-16 overflow-y-auto border-t border-line bg-surface p-4 md:hidden"
      >
        <ul className="flex flex-col gap-1">
          {[...mainLinks, ...legalLinks].map((item, index) => (
            <li key={item.path}>
              <NavLink
                ref={index === 0 ? firstLinkRef : undefined}
                to={item.path}
                end={item.path === "/"}
                onClick={() => setOpenPath(null)}
                className={mobileLinkClass}
              >
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}