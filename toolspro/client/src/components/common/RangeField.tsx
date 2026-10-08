interface RangeFieldProps {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
  hint?: string;
}

export function RangeField({ id, label, value, min, max, onChange, hint }: RangeFieldProps) {
  const hintId = `${id}-hint`;
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-heading">
        {label}: <span className="tabular-nums">{value}</span>
      </label>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-describedby={hint ? hintId : undefined}
        className="h-6 w-full accent-primary"
      />
      {hint ? (
        <p id={hintId} className="mt-1 text-sm">
          {hint}
        </p>
      ) : null}
    </div>
  );
}