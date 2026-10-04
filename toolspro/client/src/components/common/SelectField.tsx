interface SelectFieldProps<T extends string> {
  id: string;
  label: string;
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string }[];
  hint?: string;
}

export function SelectField<T extends string>({ id, label, value, onChange, options, hint }: SelectFieldProps<T>) {
  const hintId = `${id}-hint`;
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-heading">
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        aria-describedby={hint ? hintId : undefined}
        className="h-11 w-full rounded-lg border border-line bg-surface px-3 text-base text-heading"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {hint ? (
        <p id={hintId} className="mt-1 text-sm">
          {hint}
        </p>
      ) : null}
    </div>
  );
}