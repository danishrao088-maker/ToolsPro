export function CardSkeleton() {
  return (
    <div aria-hidden="true" className="animate-pulse rounded-xl border border-line bg-surface p-5">
      <div className="h-11 w-11 rounded-lg bg-surface-muted" />
      <div className="mt-4 h-4 w-2/3 rounded bg-surface-muted" />
      <div className="mt-2 h-3 w-full rounded bg-surface-muted" />
      <div className="mt-1 h-3 w-4/5 rounded bg-surface-muted" />
    </div>
  );
}