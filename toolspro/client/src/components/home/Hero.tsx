import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Search } from "lucide-react";
import { Container } from "../common/Container";

export function Hero() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const q = query.trim();
    navigate(q ? `/tools?q=${encodeURIComponent(q)}` : "/tools");
  };

  return (
    <section className="relative overflow-hidden bg-linear-to-br from-hero to-hero-secondary">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute -right-16 -top-16 h-64 w-64 rotate-12 rounded-3xl border border-white/10" />
        <div className="absolute -bottom-20 left-10 h-56 w-56 -rotate-12 rounded-3xl border border-white/10" />
        <div className="absolute right-1/4 top-1/3 h-24 w-24 rotate-45 rounded-2xl bg-white/5" />
      </div>

      <Container className="relative py-16 text-center sm:py-20 lg:py-24">
        <h1 className="mx-auto max-w-3xl text-balance text-3xl font-bold leading-tight text-white sm:text-5xl">
          Free Online Tools for Everyone
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-base text-white/80 sm:text-lg">
          Simple, powerful tools to make your everyday work easier. No registration, no hidden charges.
        </p>

        <form onSubmit={onSubmit} role="search" className="mx-auto mt-8 flex max-w-2xl flex-col gap-3 sm:flex-row">
          <label htmlFor="hero-search" className="sr-only">
            Search tools
          </label>
          <div className="relative flex-1">
            <Search aria-hidden="true" size={20} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
            <input
              id="hero-search"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search tools (e.g. PDF, image, text, SEO)..."
              className="h-12 w-full rounded-lg border border-transparent bg-white pl-12 pr-4 text-base text-[#171b32] placeholder:text-[#626b82]"
            />
          </div>
          <button
            type="submit"
            className="h-12 rounded-lg bg-primary px-6 font-medium text-white transition-colors hover:bg-primary-hover"
          >
            Search
          </button>
        </form>
      </Container>
    </section>
  );
}