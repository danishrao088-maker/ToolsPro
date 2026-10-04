import { CircleAlert } from "lucide-react";

interface FormFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  hint?: string;
  multiline?: boolean;
  rows?: number;
  type?: "text" | "email" | "url" | "date";
  autoComplete?: string;
  required?: boolean;
  placeholder?: string;
}

const baseClass = "w-full rounded-lg border bg-surface px-3 text-base text-heading placeholder:text-body";

export function FormField({
  id,
  label,
  value,
  onChange,
  error,
  hint,
  multiline = false,
  rows = 6,
  type = "text",
  autoComplete,
  required = true,
  placeholder,
}: FormFieldProps) {
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(" ") || undefined;
  const className = `${baseClass} ${error ? "border-danger" : "border-line"}`;

  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-heading">
        {label}
        {required ? null : <span className="font-normal text-body"> (optional)</span>}
      </label>
      {multiline ? (
        <textarea
          id={id}
          value={value}
          rows={rows}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          aria-required={required ? "true" : undefined}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={`${className} resize-y py-3`}
        />
      ) : (
        <input
          id={id}
          type={type}
          value={value}
          autoComplete={autoComplete}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          aria-required={required ? "true" : undefined}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={`${className} h-11`}
        />
      )}
      {hint ? (
        <p id={hintId} className="mt-1 text-sm">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className="mt-1 flex items-center gap-1.5 text-sm text-danger">
          <CircleAlert aria-hidden="true" size={16} className="shrink-0" />
          {error}
        </p>
      ) : null}
    </div>
  );
}