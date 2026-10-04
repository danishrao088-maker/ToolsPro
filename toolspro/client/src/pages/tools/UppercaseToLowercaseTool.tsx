import { useState, type FormEvent } from "react";
import { CircleCheck, Eraser } from "lucide-react";
import { Button } from "../../components/common/Button";
import { InlineError } from "../../components/common/InlineError";
import { CopyButton } from "../../components/tools/CopyButton";
import { DownloadButton } from "../../components/tools/DownloadButton";
import { ToolTextarea } from "../../components/tools/ToolTextarea";
import { convertToLowercase, type ConvertResult } from "../../lib/tools/caseConverter";

export default function UppercaseToLowercaseTool() {
  const [input, setInput] = useState("");
  const [result, setResult] = useState<ConvertResult | null>(null);

  const output = result?.ok ? result.output : "";
  const error = result && !result.ok ? result.error : null;

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setResult(convertToLowercase(input));
  };

  const onInputChange = (value: string) => {
    setInput(value);
    setResult(null); // purana nateeja ab purana ho gaya
  };

  const onClear = () => {
    setInput("");
    setResult(null);
  };

  return (
    <form onSubmit={onSubmit} className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-3">
        <ToolTextarea
          id="case-input"
          label="Your text"
          value={input}
          onChange={onInputChange}
          placeholder="Paste or type text in UPPERCASE here..."
          invalid={error !== null}
        />
        <p className="text-sm">{input.length.toLocaleString("en-US")} characters</p>
        <div className="flex flex-wrap gap-3">
          <Button type="submit">Convert to lowercase</Button>
          <Button variant="outline" onClick={onClear} disabled={input === ""}>
            <Eraser aria-hidden="true" size={18} />
            Clear
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        <ToolTextarea
          id="case-output"
          label="Result"
          value={output}
          readOnly
          placeholder="Your lowercase text will appear here."
        />
        <div className="flex flex-wrap items-center gap-3">
          <CopyButton text={output} disabled={output === ""} />
          <DownloadButton filename="lowercase-text.txt" content={output} disabled={output === ""} />
        </div>
      </div>

      <div className="space-y-3 lg:col-span-2">
        {error ? <InlineError message={error} /> : null}
        <p role="status" className="flex min-h-6 items-center gap-2 text-success">
          {result?.ok ? (
            <>
              <CircleCheck aria-hidden="true" size={18} />
              Converted {result.characters.toLocaleString("en-US")} characters ({result.words.toLocaleString("en-US")}{" "}
              {result.words === 1 ? "word" : "words"}) to lowercase.
            </>
          ) : null}
        </p>
      </div>
    </form>
  );
}