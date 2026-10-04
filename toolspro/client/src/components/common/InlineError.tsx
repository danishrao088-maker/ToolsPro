import { CircleAlert } from "lucide-react";

interface InlineErrorProps {
  message: string;
  onRetry?: () => void;
}

export function InlineError({ message, onRetry }: InlineErrorProps) {
  return (
    <div
      role="alert"
      className="flex flex-col items-start gap-3 rounded-xl border border-danger bg-surface p-5 sm:flex-row sm:items-center sm:justify-between"
    >
      <p className="flex items-center gap-2 text-danger">
        <CircleAlert aria-hidden="true" size={20} className="shrink-0" />
        <span>{message}</span>
      </p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="rounded-lg border border-line px-4 py-2 text-sm font-medium text-heading transition-colors hover:bg-surface-muted"
        >
          Try again
        </button>
      ) : null}
    </div>
  );
}