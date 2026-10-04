import { useState, type FormEvent } from "react";
import { CircleCheck, RotateCcw } from "lucide-react";
import { Button } from "../../components/common/Button";
import { InlineError } from "../../components/common/InlineError";
import { plural } from "../../lib/format";
import { calculateAge, toISODate, type AgeResult } from "../../lib/tools/ageCalculator";

const fieldClass = "h-11 w-full rounded-lg border border-line bg-surface px-3 text-base text-heading";
const labelClass = "mb-1 block text-sm font-medium text-heading";

export default function AgeCalculatorTool() {
  const [today] = useState(() => toISODate(new Date()));
  const [birth, setBirth] = useState("");
  const [asOf, setAsOf] = useState(today);
  const [result, setResult] = useState<AgeResult | null>(null);

  const error = result && !result.ok ? result.error : null;

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setResult(calculateAge(birth, asOf));
  };

  const onReset = () => {
    setBirth("");
    setAsOf(today);
    setResult(null);
  };

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="age-birth" className={labelClass}>
            Date of birth
          </label>
          <input
            id="age-birth"
            type="date"
            value={birth}
            max={today}
            onChange={(e) => {
              setBirth(e.target.value);
              setResult(null);
            }}
            aria-invalid={error !== null || undefined}
            className={fieldClass}
          />
        </div>
        <div>
          <label htmlFor="age-as-of" className={labelClass}>
            Age at the date of
          </label>
          <input
            id="age-as-of"
            type="date"
            value={asOf}
            onChange={(e) => {
              setAsOf(e.target.value);
              setResult(null);
            }}
            className={fieldClass}
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <Button type="submit">Calculate age</Button>
        <Button variant="ghost" onClick={onReset}>
          <RotateCcw aria-hidden="true" size={18} />
          Reset
        </Button>
      </div>

      {error ? <InlineError message={error} /> : null}

      <div role="status" aria-live="polite" className="min-h-6">
        {result?.ok ? (
          <div className="rounded-lg bg-surface-muted p-5">
            <p className="flex items-center gap-2 text-sm font-medium text-success">
              <CircleCheck aria-hidden="true" size={18} />
              Age calculated
            </p>
            <p className="mt-2 text-2xl font-bold text-heading">
              {plural(result.years, "year")}, {plural(result.months, "month")}, {plural(result.days, "day")}
            </p>
            <dl className="mt-4 grid gap-4 sm:grid-cols-3">
              <div>
                <dt className="text-sm">Total months</dt>
                <dd className="font-semibold text-heading">{result.totalMonths.toLocaleString("en-US")}</dd>
              </div>
              <div>
                <dt className="text-sm">Total days</dt>
                <dd className="font-semibold text-heading">{result.totalDays.toLocaleString("en-US")}</dd>
              </div>
              <div>
                <dt className="text-sm">Next birthday</dt>
                <dd className="font-semibold text-heading">
                  {result.daysUntilBirthday === 0 ? "On this date" : `In ${plural(result.daysUntilBirthday, "day")}`}
                </dd>
              </div>
            </dl>
          </div>
        ) : null}
      </div>
    </form>
  );
}