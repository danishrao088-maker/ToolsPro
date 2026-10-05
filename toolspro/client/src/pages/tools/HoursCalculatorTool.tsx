import { useState } from "react";
import { RotateCcw } from "lucide-react";
import { Button } from "../../components/common/Button";
import { CheckboxField } from "../../components/common/CheckboxField";
import { FormField } from "../../components/common/FormField";
import { InlineError } from "../../components/common/InlineError";
import { plural } from "../../lib/format";
import { MAX_BREAK_MINUTES, calculateHours } from "../../lib/tools/hoursCalculator";

export default function HoursCalculatorTool() {
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [breakMinutes, setBreakMinutes] = useState("");
  const [endsNextDay, setEndsNextDay] = useState(false);

  // Derived state: nateeja har render par input se nikalta hai
  const result = start !== "" && end !== "" ? calculateHours({ start, end, breakMinutes, endsNextDay }) : null;

  const reset = () => {
    setStart("");
    setEnd("");
    setBreakMinutes("");
    setEndsNextDay(false);
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField id="hours-start" label="Start time" type="time" value={start} onChange={setStart} />
        <FormField id="hours-end" label="End time" type="time" value={end} onChange={setEnd} />
      </div>
      <FormField
        id="hours-break"
        label="Break (minutes)"
        required={false}
        value={breakMinutes}
        onChange={setBreakMinutes}
        hint={`A whole number from 0 to ${MAX_BREAK_MINUTES}. Leave empty for no break.`}
      />
      <CheckboxField
        id="hours-next-day"
        label="The shift ends the next day"
        hint="Tick this for overnight shifts, such as 10:00 PM to 6:00 AM."
        checked={endsNextDay}
        onChange={setEndsNextDay}
      />
      <Button variant="ghost" onClick={reset}>
        <RotateCcw aria-hidden="true" size={18} />
        Reset
      </Button>

      {result && !result.ok ? <InlineError message={result.error} /> : null}

      <div role="status" className="rounded-lg border border-line bg-surface p-4">
        {result?.ok ? (
          <>
            <p className="text-2xl font-semibold text-heading">{result.label}</p>
            <p className="mt-1">
              {result.decimalHours} decimal hours ({plural(result.netMinutes, "minute")} in total)
            </p>
          </>
        ) : result ? null : (
          <p>Enter a start and end time to see the result.</p>
        )}
      </div>
    </div>
  );
}