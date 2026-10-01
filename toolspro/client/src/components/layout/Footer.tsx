import { Link } from "react-router-dom";
import { Container } from "../common/Container";
import { Logo } from "../common/Logo";
import { legalLinks, mainLinks } from "../../data/navigation";

const footerLinkClass = "text-sm text-body transition-colors hover:text-link";

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-line bg-surface-muted">
      <Container className="py-10">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <Link to="/" className="inline-block rounded-md">
              <Logo />
            </Link>
            <p className="mt-3 max-w-sm text-sm">
              Simple, powerful tools to make your everyday work easier.
            </p>
          </div>

          <nav aria-label="Footer">
            <h2 className="text-sm font-semibold text-heading">Navigation</h2>
            <ul className="mt-3 space-y-2">
              {mainLinks.map((item) => (
                <li key={item.path}>
                  <Link to={item.path} className={footerLinkClass}>
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label="Legal">
            <h2 className="text-sm font-semibold text-heading">Legal</h2>
            <ul className="mt-3 space-y-2">
              {legalLinks.map((item) => (
                <li key={item.path}>
                  <Link to={item.path} className={footerLinkClass}>
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <p className="mt-8 border-t border-line pt-6 text-sm text-body">
          © {year} ToolsPro. All rights reserved.
        </p>
      </Container>
    </footer>
  );
}