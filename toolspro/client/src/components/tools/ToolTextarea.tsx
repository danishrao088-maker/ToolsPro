interface ToolTextareaProps {
  id: string;
  label: string;
  value: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  readOnly?: boolean;
  invalid?: boolean;
  rows?: number;
  mono?: boolean;
  spellCheck?: boolean;
  dir?: "auto" | "ltr" | "rtl";
}

export function ToolTextarea({
  id,
  label,
  value,
  onChange,
  placeholder,
  readOnly = false,
  invalid = false,
  rows = 10,
  mono = false,
  spellCheck = false,
  dir,
}: ToolTextareaProps) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-heading">
        {label}
      </label>
      <textarea
        id={id}
        value={value}
        onChange={onChange ? (e) => onChange(e.target.value) : undefined}
        readOnly={readOnly}
        placeholder={placeholder}
        rows={rows}
        dir={dir}
        aria-invalid={invalid || undefined}
        spellCheck={spellCheck}
        className={`w-full resize-y rounded-lg border bg-surface p-3 text-heading placeholder:text-body ${
          mono ? "font-mono text-sm" : "text-base"
        } ${invalid ? "border-danger" : "border-line"} ${readOnly ? "bg-surface-muted" : ""}`}
      />
    </div>
  );
}