import { useState } from "react";
import { CircleCheck, Eraser } from "lucide-react";
import type { TransformResult } from "../../lib/tools/types";
import { Button } from "../common/Button";
import { InlineError } from "../common/InlineError";
import { CopyButton } from "./CopyButton";
import { DownloadButton } from "./DownloadButton";
import { ToolTextarea } from "./ToolTextarea";

export interface TextAction {
  label: string;
  run: (input: string) => TransformResult;
}

interface TextTransformWorkspaceProps {
  idPrefix: string;
  inputLabel: string;
  inputPlaceholder: string;
  outputLabel: string;
  outputPlaceholder: string;
  actions: TextAction[];
  downloadFilename: string;
  downloadMimeType?: string;
}

export function TextTransformWorkspace({
  idPrefix,
  inputLabel,
  inputPlaceholder,
  outputLabel,
  outputPlaceholder,
  actions,
  downloadFilename,
  downloadMimeType,
}: TextTransformWorkspaceProps) {
  const [input, setInput] = useState("");
  const [result, setResult] = useState<TransformResult | null>(null);

  const output = result?.ok ? result.output : "";
  const message = result?.ok ? result.message : "";
  const error = result && !result.ok ? result.error : null;

  const onInputChange = (value: string) => {
    setInput(value);
    setResult(null); // purana nateeja ab purana ho gaya
  };

  const onClear = () => {
    setInput("");
    setResult(null);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-3">
        <ToolTextarea
          id={`${idPrefix}-input`}
          label={inputLabel}
          value={input}
          onChange={onInputChange}
          placeholder={inputPlaceholder}
          invalid={error !== null}
        />
        <p className="text-sm">{input.length.toLocaleString("en-US")} characters</p>
        <div className="flex flex-wrap gap-3">
          {actions.map((action, index) => (
            <Button
              key={action.label}
              variant={index === 0 ? "primary" : "outline"}
              onClick={() => setResult(action.run(input))}
            >
              {action.label}
            </Button>
          ))}
          <Button variant="ghost" onClick={onClear} disabled={input === ""}>
            <Eraser aria-hidden="true" size={18} />
            Clear
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        <ToolTextarea
          id={`${idPrefix}-output`}
          label={outputLabel}
          value={output}
          readOnly
          placeholder={outputPlaceholder}
        />
        <div className="flex flex-wrap items-center gap-3">
          <CopyButton text={output} disabled={output === ""} />
          <DownloadButton
            filename={downloadFilename}
            content={output}
            mimeType={downloadMimeType}
            disabled={output === ""}
          />
        </div>
      </div>

      <div className="space-y-3 lg:col-span-2">
        {error ? <InlineError message={error} /> : null}
        <p role="status" className="flex min-h-6 items-center gap-2 text-success">
          {message ? (
            <>
              <CircleCheck aria-hidden="true" size={18} />
              {message}
            </>
          ) : null}
        </p>
      </div>
    </div>
  );
}