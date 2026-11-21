import { NavLink, Link, Outlet } from "react-router-dom";
import { ExternalLink, LogOut } from "lucide-react";
import { Container } from "../components/common/Container";
import { SITE_NAME } from "../data/site";
import { confirmLeave } from "./unsaved";
import { useUnreadMessages } from "./hooks";
import { smallButtonClass } from "./ui";

const NAV = [
  { to: "/admin", label: "Dashboard", end: true },
  { to: "/admin/posts", label: "Posts", end: false },
  { to: "/admin/messages", label: "Messages", end: false },
  { to: "/admin/categories", label: "Categories", end: false },
  { to: "/admin/tags", label: "Tags", end: false },
];

const navClass = ({ isActive }: { isActive: boolean }) =>
  `whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
    isActive ? "bg-surface-muted text-heading" : "text-body hover:bg-surface-muted hover:text-heading"
  }`;

interface AdminLayoutProps {
  email: string;
  signingOut: boolean;
  onSignOut: () => void;
}

export function AdminLayout({ email, signingOut, onSignOut }: AdminLayoutProps) {
  const unread = useUnreadMessages().data?.unread ?? 0;
  return (
    <div className="min-h-screen bg-page">
      <header className="border-b border-line bg-surface">
        <Container className="flex flex-wrap items-center gap-x-6 gap-y-2 py-3">
          <Link to="/admin" onClick={(e) => !confirmLeave() && e.preventDefault()} className="text-base font-bold text-heading">
            {SITE_NAME} Admin
          </Link>
          <nav aria-label="Admin" className="order-last flex w-full gap-1 overflow-x-auto sm:order-none sm:w-auto sm:flex-1">
            {NAV.map((item) => (
              <NavLink key={item.to} to={item.to} end={item.end} className={navClass} onClick={(e) => !confirmLeave() && e.preventDefault()}>
                {item.label}
                {item.to === "/admin/messages" && unread > 0 ? (
                  <span className="ml-1.5 rounded-full bg-primary px-1.5 py-0.5 align-middle text-xs font-semibold text-white">
                    {unread > 99 ? "99+" : unread}
                    <span className="sr-only"> unread</span>
                  </span>
                ) : null}
              </NavLink>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-3 sm:ml-0">
            <a href="/blog/" target="_blank" rel="noreferrer" className="hidden items-center gap-1 text-sm font-medium text-link hover:underline sm:inline-flex">
              View blog <ExternalLink aria-hidden="true" size={14} />
            </a>
            <span className="hidden max-w-[14rem] truncate text-sm md:inline">{email}</span>
            <button
              type="button"
              className={smallButtonClass}
              disabled={signingOut}
              onClick={() => {
                if (confirmLeave()) onSignOut();
              }}
            >
              <LogOut aria-hidden="true" size={16} /> Sign out
            </button>
          </div>
        </Container>
      </header>
      <Container className="py-8">
        <Outlet />
      </Container>
    </div>
  );
}
