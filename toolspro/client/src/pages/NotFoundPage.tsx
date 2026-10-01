import { Link } from "react-router-dom";
import { Container } from "../components/common/Container";

export default function NotFoundPage() {
  return (
    <Container className="py-20 text-center">
      <p className="text-sm font-semibold text-link">404</p>
      <h1 className="mt-2 text-3xl font-bold text-heading sm:text-4xl">Page not found</h1>
      <p className="mx-auto mt-3 max-w-md">
        The page you are looking for does not exist or may have moved.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link
          to="/"
          className="rounded-lg bg-primary px-5 py-3 font-medium text-white transition-colors hover:bg-primary-hover"
        >
          Go to Home
        </Link>
        <Link
          to="/tools"
          className="rounded-lg border border-line bg-surface px-5 py-3 font-medium text-heading transition-colors hover:bg-surface-muted"
        >
          Browse All Tools
        </Link>
      </div>
    </Container>
  );
}