import type { ReactNode } from "react";
import { failureTitle, formatMs, statusMeaning } from "../../lib/web/format";
import type { Failure, HeaderItem, Level } from "../../lib/web/webApi";

// Natije dikhane ke chhote hissay. Rang ke saath hamesha lafz/nishan bhi hota hai, sirf rang par bharosa nahi.

const LEVELS: Record<Level, { symbol: string; label: string; className: string }> = {
  good: { symbol: "✓", label: "Good", className: "text-success" },
  warning: { symbol: "!", label: "Check this", className: "text-danger" },
  missing: { symbol: "✗", label: "Missing", className: "text-danger" },
  info: { symbol: "i", label: "Note", className: "text-body" },
};

export function LevelBadge({ level }: { level: Level }) {
  const item = LEVELS[level];
  return (
    <span className={`inline-flex items-center gap-1 whitespace-nowrap text-sm font-medium ${item.className}`}>
      <span aria-hidden="true">{item.symbol}</span>
      {item.label}
    </span>
  );
}

export function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-2 rounded-lg border border-line p-4">
      <h3 className="text-base font-semibold text-heading">{title}</h3>
      {children}
    </section>
  );
}

export function Facts({ items }: { items: { label: string; value: ReactNode }[] }) {
  return (
    <dl className="grid gap-x-4 gap-y-2 sm:grid-cols-[max-content_1fr]">
      {items.map((item) => (
        <div key={item.label} className="contents">
          <dt className="text-sm font-medium text-heading">{item.label}</dt>
          <dd className="min-w-0 break-words text-body">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function Mono({ children }: { children: ReactNode }) {
  return <code className="break-all rounded bg-surface-muted px-1 py-0.5 text-sm text-heading">{children}</code>;
}

export function Note({ children }: { children: ReactNode }) {
  return <p className="text-sm text-body">{children}</p>;
}

export function StatusCode({ status }: { status: number }) {
  const className = status >= 200 && status < 300 ? "text-success" : status >= 300 && status < 400 ? "text-heading" : "text-danger";
  return <span className={`font-semibold ${className}`}>{status}</span>;
}

export function StatusSummary({ status, statusText }: { status: number; statusText: string }) {
  return (
    <div>
      <p className="text-3xl font-bold">
        <StatusCode status={status} /> <span className="text-xl font-semibold text-heading">{statusText}</span>
      </p>
      <p className="mt-1 text-body">{statusMeaning(status)}</p>
    </div>
  );
}

export function FailureBox({ failure, timeMs }: { failure: Failure; timeMs?: number }) {
  return (
    <div role="alert" className="rounded-lg border border-line p-4">
      <p className="font-semibold text-danger">{failureTitle(failure.reason)}</p>
      <p className="mt-1 text-body">{failure.message}</p>
      {timeMs !== undefined && <p className="mt-1 text-sm text-body">Stopped after {formatMs(timeMs)}.</p>}
    </div>
  );
}

export function HeadersList({ headers }: { headers: HeaderItem[] }) {
  if (headers.length === 0) return null;
  return (
    <details className="rounded-lg border border-line p-4">
      <summary className="cursor-pointer font-semibold text-heading">Response headers ({headers.length})</summary>
      <dl className="mt-3 space-y-2">
        {headers.map((header) => (
          <div key={header.name}>
            <dt className="text-sm font-medium text-heading">{header.name}</dt>
            <dd className="break-all text-sm text-body">{header.value}</dd>
          </div>
        ))}
      </dl>
    </details>
  );
}

export function SummaryCounts({ good, warning, missing }: { good: number; warning: number; missing: number }) {
  return (
    <p className="text-body">
      <span className="font-semibold text-success">{good} good</span>, <span className="font-semibold text-danger">{warning} to check</span>, <span className="font-semibold text-danger">{missing} missing</span>
    </p>
  );
}
