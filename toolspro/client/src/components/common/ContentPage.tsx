import type { ReactNode } from "react";
import { Breadcrumbs } from "./Breadcrumbs";
import { Container } from "./Container";

export const contentLinkClass = "font-medium text-link underline";

interface ContentPageProps {
  title: string;
  intro?: string;
  updated?: string;
  children: ReactNode;
}

export function ContentPage({ title, intro, updated, children }: ContentPageProps) {
  return (
    <Container className="py-10">
      <div className="max-w-3xl">
        <Breadcrumbs items={[{ label: "Home", to: "/" }, { label: title }]} />
        <h1 className="text-3xl font-bold text-heading">{title}</h1>
        {updated ? <p className="mt-2 text-sm">Last updated: {updated}</p> : null}
        {intro ? <p className="mt-4 text-lg">{intro}</p> : null}
        {children}
      </div>
    </Container>
  );
}

interface ContentSectionProps {
  id: string;
  heading: string;
  children: ReactNode;
}

export function ContentSection({ id, heading, children }: ContentSectionProps) {
  return (
    <section aria-labelledby={id} className="mt-8">
      <h2 id={id} className="text-xl font-bold text-heading">
        {heading}
      </h2>
      <div className="mt-3 space-y-3">{children}</div>
    </section>
  );
}

export function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="list-disc space-y-1.5 pl-6">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}