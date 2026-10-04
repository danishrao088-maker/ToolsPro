import { useState, type FormEvent } from "react";
import { Eye, RotateCcw } from "lucide-react";
import { Button } from "../../components/common/Button";
import { CheckboxField } from "../../components/common/CheckboxField";
import { InlineError } from "../../components/common/InlineError";
import { ToolTextarea } from "../../components/tools/ToolTextarea";
import { buildPreview } from "../../lib/tools/htmlViewer";

const SAMPLE = `<h1>Hello!</h1>
<p>Edit this code, then select <strong>Show preview</strong>.</p>
<button>A button</button>`;

interface Preview {
  document: string;
  sandbox: string;
  version: number;
  message: string;
}

export default function HtmlViewerTool() {
  const [html, setHtml] = useState(SAMPLE);
  const [allowScripts, setAllowScripts] = useState(false);
  const [allowExternal, setAllowExternal] = useState(false);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const result = buildPreview(html, { allowScripts, allowExternal });
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setError(null);
    setPreview((prev) => ({
      document: result.document,
      // Khali sandbox = sab kuch band. Sirf scripts kholein to "allow-same-origin" kabhi nahi dete.
      sandbox: allowScripts ? "allow-scripts" : "",
      version: (prev?.version ?? 0) + 1,
      message: result.message,
    }));
  };

  const handleReset = () => {
    setHtml(SAMPLE);
    setAllowScripts(false);
    setAllowExternal(false);
    setPreview(null);
    setError(null);
  };

  return (
    <form noValidate onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-4">
        <ToolTextarea id="html-input" label="HTML code" value={html} onChange={setHtml} mono rows={16} />

        <CheckboxField
          id="html-scripts"
          label="Allow scripts to run"
          hint="Off by default. Turn it on only for code you wrote or trust. Scripts run in a sandbox, apart from this page."
          checked={allowScripts}
          onChange={setAllowScripts}
        />
        <CheckboxField
          id="html-external"
          label="Allow images, styles and fonts from other websites"
          hint="Off by default. When on, your browser may contact the websites named in your code."
          checked={allowExternal}
          onChange={setAllowExternal}
        />

        <div className="flex flex-wrap gap-3">
          <Button type="submit">
            <Eye aria-hidden="true" size={18} />
            Show preview
          </Button>
          <Button variant="ghost" onClick={handleReset}>
            <RotateCcw aria-hidden="true" size={18} />
            Reset
          </Button>
        </div>
        {error ? <InlineError message={error} /> : null}
      </div>

      <div className="space-y-3">
        <p className="text-sm font-medium text-heading">Preview</p>
        {preview ? (
          <iframe
            // key badalne se iframe naya ban jata hai, jo sandbox badalne ke liye zaroori hai
            key={preview.version}
            title="HTML preview"
            sandbox={preview.sandbox}
            srcDoc={preview.document}
            className="h-[480px] w-full rounded-lg border border-line bg-white"
          />
        ) : (
          <div className="flex h-[480px] items-center justify-center rounded-lg border border-dashed border-line p-6 text-center">
            Your preview will appear here.
          </div>
        )}
        <p role="status" className="min-h-6 text-sm">
          {preview?.message}
        </p>
      </div>
    </form>
  );
}