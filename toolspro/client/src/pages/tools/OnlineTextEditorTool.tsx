import { useDeferredValue, useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { Eraser, FolderOpen, Undo2 } from "lucide-react";
import { Button } from "../../components/common/Button";
import { InlineError } from "../../components/common/InlineError";
import { CopyButton } from "../../components/tools/CopyButton";
import { DownloadButton } from "../../components/tools/DownloadButton";
import { ToolTextarea } from "../../components/tools/ToolTextarea";
import { MAX_EDITOR_CHARS, checkOpenedFile, countText } from "../../lib/tools/textStats";

export default function OnlineTextEditorTool() {
  const [text, setText] = useState("");
  const [undoText, setUndoText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);

  // Bade text par har key ke saath ginti na chalaen: React pehle typing dikhata hai, ginti baad mein
  const deferredText = useDeferredValue(text);
  const stats = useMemo(() => countText(deferredText), [deferredText]);

  // Text save nahi hota, is liye page chhorne se pehle browser se poochne ko kehte hain
  const hasText = text !== "";
  useEffect(() => {
    if (!hasText) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [hasText]);

  const handleChange = (value: string) => {
    if (value.length > MAX_EDITOR_CHARS) {
      setError(`The editor holds up to ${MAX_EDITOR_CHARS.toLocaleString("en-US")} characters. That text was not added.`);
      return;
    }
    setError(null);
    setStatus("");
    setUndoText(null);
    setText(value);
  };

  const handleClear = () => {
    if (text === "") return;
    setUndoText(text);
    setText("");
    setError(null);
    setStatus("The text was cleared. You can undo this.");
  };

  const handleUndo = () => {
    if (undoText === null) return;
    setText(undoText);
    setUndoText(null);
    setStatus("The text was restored.");
  };

  const handleFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const file = input.files?.[0];
    input.value = ""; // dobara wohi file chunne par bhi change event aaye
    if (!file) return;

    const early = checkOpenedFile(file.size, "");
    if (!early.ok) {
      setError(early.error);
      return;
    }
    try {
      const content = await file.text();
      const check = checkOpenedFile(file.size, content);
      if (!check.ok) {
        setError(check.error);
        return;
      }
      setUndoText(text === "" ? null : text); // purana text wapas mil sake
      setText(content);
      setError(null);
      setStatus(`Opened ${file.name}.`);
    } catch {
      setError("That file could not be read.");
    }
  };

  return (
    <div className="space-y-4">
      <ToolTextarea
        id="editor-text"
        label="Your text"
        value={text}
        onChange={handleChange}
        rows={18}
        spellCheck
        dir="auto"
        placeholder="Start typing, paste text, or open a text file."
      />

      <div className="flex flex-wrap items-center gap-3">
        <input
          ref={fileInput}
          type="file"
          accept=".txt,.md,.csv,.json,.html,.xml,.log,text/plain"
          onChange={handleFile}
          className="hidden"
          tabIndex={-1}
          aria-hidden="true"
        />
        <Button variant="ghost" onClick={() => fileInput.current?.click()}>
          <FolderOpen aria-hidden="true" size={18} />
          Open a file
        </Button>
        <CopyButton text={text} disabled={text === ""} />
        <DownloadButton filename="document.txt" content={text} mimeType="text/plain;charset=utf-8" disabled={text === ""} />
        <Button variant="ghost" onClick={handleClear} disabled={text === ""}>
          <Eraser aria-hidden="true" size={18} />
          Clear
        </Button>
        {undoText !== null ? (
          <Button variant="ghost" onClick={handleUndo}>
            <Undo2 aria-hidden="true" size={18} />
            Undo
          </Button>
        ) : null}
      </div>

      {error ? <InlineError message={error} /> : null}
      <p role="status" className="min-h-6">
        {status}
      </p>

      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {[
          ["Words", stats.words],
          ["Characters", stats.characters],
          ["Without spaces", stats.charactersNoSpaces],
          ["Lines", stats.lines],
          ["Paragraphs", stats.paragraphs],
        ].map(([label, value]) => (
          <div key={label} className="rounded-lg border border-line bg-surface p-3">
            <dt className="text-sm">{label}</dt>
            <dd className="text-xl font-semibold tabular-nums text-heading">{(value as number).toLocaleString("en-US")}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}