import type { ReactNode } from "react";
import { SearchX } from "lucide-react";

interface EmptyStateProps {
  title: string;
  description: string;
  action?: ReactNode;
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="rounded-xl border border-dashed border-line bg-surface px-6 py-12 text-center">
      <SearchX aria-hidden="true" size={32} className="mx-auto text-muted" />
      <h2 className="mt-4 text-lg font-semibold text-heading">{title}</h2>
      <p className="mx-auto mt-1 max-w-md">{description}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}