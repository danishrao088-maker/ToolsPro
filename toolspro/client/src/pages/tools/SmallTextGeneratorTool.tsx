import { useState } from "react";
import { Eraser } from "lucide-react";
import { Button } from "../../components/common/Button";
import { InlineError } from "../../components/common/InlineError";
import { CopyButton } from "../../components/tools/CopyButton";
import { ToolTextarea } from "../../components/tools/ToolTextarea";
import { plural } from "../../lib/format";
import { SMALL_TEXT_STYLES, convertSmallText } from "../../lib/tools/smallText";

export default function SmallTextGeneratorTool() {
  const [text, setText] = useState("");
  const results = SMALL_TEXT_STYLES.map((style) => ({ style, result: convertSmallText(text, style.value) }));
  const firstError = results.find((item) => !item.result.ok)?.result;

  return (
    <div className="space-y-6">
      <ToolTextarea
        id="small-input"
        label="Your text"
        value={text}
        onChange={setText}
        placeholder="Type or paste your text here."
        rows={4}
      />
      <Button variant="ghost" onClick={() => setText("")}>
        <Eraser aria-hidden="true" size={18} />
        Clear
      </Button>

      {firstError && !firstError.ok ? <InlineError message={firstError.error} /> : null}

      <div className="space-y-6">
        {results.map(({ style, result }) => {
          const output = result.ok ? result.output : "";
          return (
            <div key={style.value} className="space-y-2">
              <ToolTextarea
                id={`small-${style.value}`}
                label={style.label}
                value={output}
                readOnly
                rows={2}
                placeholder="Your result will appear here."
              />
              <div className="flex flex-wrap items-center gap-3">
                <CopyButton text={output} disabled={output === ""} />
                {result.ok && result.unchanged > 0 ? (
                  <span role="status" className="text-sm">
                    {plural(result.unchanged, "letter")} cannot be converted in this style and stayed the same.
                  </span>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}