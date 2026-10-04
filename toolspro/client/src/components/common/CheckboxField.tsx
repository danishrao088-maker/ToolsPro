interface CheckboxFieldProps {
  id: string;
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  hint?: string;
}

export function CheckboxField({ id, label, checked, onChange, hint }: CheckboxFieldProps) {
  return (
    <div className="flex items-start gap-3">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-5 w-5 shrink-0 rounded border-line accent-primary"
      />
      <label htmlFor={id} className="text-sm font-medium text-heading">
        {label}
        {hint ? <span className="block font-normal text-body">{hint}</span> : null}
      </label>
    </div>
  );
}