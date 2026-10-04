import { useState } from "react";
import { FormField } from "../../components/common/FormField";
import { InlineError } from "../../components/common/InlineError";
import { CopyButton } from "../../components/tools/CopyButton";
import {
  INVISIBLE_CHARS,
  MAX_REPEAT,
  formatCodePoint,
  parseRepeatCount,
  repeatChar,
} from "../../lib/tools/invisibleChars";

export default function InvisibleCharacterTool() {
  const [countText, setCountText] = useState("1");
  const count = parseRepeatCount(countText);
  const countError = Number.isInteger(count) && count >= 1 && count <= MAX_REPEAT ? null : `Enter a whole number from 1 to ${MAX_REPEAT}.`;

  return (
    <div className="space-y-6">
      <FormField
        id="invisible-count"
        label="How many characters to copy"
        value={countText}
        onChange={setCountText}
        error={countError ?? undefined}
        hint={`From 1 to ${MAX_REPEAT}.`}
      />

      {countError ? <InlineError message="Fix the number above to copy a character." /> : null}

      <ul className="space-y-3">
        {INVISIBLE_CHARS.map((item) => {
          const result = repeatChar(item.codePoint, count);
          const text = result.ok ? result.text : "";
          return (
            <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line bg-surface p-4">
              <div className="min-w-0 flex-1">
                <p className="font-medium text-heading">
                  {item.name} <span className="font-normal text-body">({formatCodePoint(item.codePoint)})</span>
                </p>
                <p className="mt-1 text-sm">{item.note}</p>
              </div>
              <CopyButton text={text} disabled={text === ""} />
            </li>
          );
        })}
      </ul>
    </div>
  );
}