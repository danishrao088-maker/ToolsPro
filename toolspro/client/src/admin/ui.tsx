import type { ReactNode } from "react";
import type { PostStatus } from "./types";

export const smallButtonClass =
  "inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-line bg-surface px-3 text-sm font-medium text-heading transition-colors hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-50";

export const primaryLinkClass =
  "inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-white transition-colors hover:bg-primary-hover";

export function PageHeading({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold text-heading">{title}</h1>
        {description ? <p className="mt-1 max-w-2xl">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function Panel({ title, children, className = "" }: { title?: string; children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-xl border border-line bg-surface p-5 ${className}`}>
      {title ? <h2 className="mb-4 text-base font-semibold text-heading">{title}</h2> : null}
      {children}
    </section>
  );
}

export function StatusBadge({ status }: { status: PostStatus }) {
  const published = status === "published";
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
        published ? "bg-success/15 text-success" : "bg-warning/15 text-warning"
      }`}
    >
      {published ? "Published" : "Draft"}
    </span>
  );
}

export function Notice({ children }: { children: ReactNode }) {
  return (
    <p role="status" className="rounded-lg border border-success bg-success/10 px-4 py-2.5 text-sm font-medium text-success">
      {children}
    </p>
  );
}
