import type { ReactNode } from "react";
import { CircleCheck, RotateCcw } from "lucide-react";
import type { TransformResult } from "../../lib/tools/types";
import { Button } from "../common/Button";
import { InlineError } from "../common/InlineError";
import { CopyButton } from "./CopyButton";
import { DownloadButton } from "./DownloadButton";
import { ToolTextarea } from "./ToolTextarea";

interface GeneratorLayoutProps {
  children: ReactNode; // form ke fields
  result: TransformResult | null;
  onGenerate: () => void;
  onReset: () => void;
  generateLabel: string;
  outputLabel: string;
  outputPlaceholder: string;
  downloadFilename: string;
  downloadMimeType?: string;
}

export function GeneratorLayout({
  children,
  result,
  onGenerate,
  onReset,
  generateLabel,
  outputLabel,
  outputPlaceholder,
  downloadFilename,
  downloadMimeType,
}: GeneratorLayoutProps) {
  const output = result?.ok ? result.output : "";
  const message = result?.ok ? result.message : "";
  const error = result && !result.ok ? result.error : null;

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        onGenerate();
      }}
      className="grid gap-6 lg:grid-cols-2"
    >
      <div className="space-y-4">
        {children}
        <div className="flex flex-wrap gap-3">
          <Button type="submit">{generateLabel}</Button>
          <Button variant="ghost" onClick={onReset}>
            <RotateCcw aria-hidden="true" size={18} />
            Reset
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        <ToolTextarea
          id="generator-output"
          label={outputLabel}
          value={output}
          readOnly
          mono
          rows={16}
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
        <p role="status" className="flex min-h-6 items-start gap-2 text-success">
          {message ? (
            <>
              <CircleCheck aria-hidden="true" size={18} className="mt-0.5 shrink-0" />
              {message}
            </>
          ) : null}
        </p>
      </div>
    </form>
  );
}