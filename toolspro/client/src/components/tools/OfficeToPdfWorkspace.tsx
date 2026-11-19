import { useEffect, useRef, useState } from "react";
import SingleFileDrop from "./SingleFileDrop";
import { convertOfficeToPdf } from "../../lib/convert/officeApi";
import { MAX_OFFICE_BYTES, OFFICE_TOOLS, acceptFor, pdfFileName, validateOfficeFile, type OfficeToolId } from "../../lib/convert/officeCore";
import { downloadBlob } from "../../lib/image/downloadBlob";
import { formatBytes } from "../../lib/image/imageCore";

type Outcome = { ok: true; blob: Blob } | { ok: false; error: string };

const PRIVACY =
  "To convert the file, this tool uploads it to our server. The server converts it in a temporary folder and deletes that copy when the conversion ends. Do not upload files you are not allowed to share.";

// Word, Excel aur PowerPoint to PDF ka saajha hissa: file chuno, bhejo, PDF download karo.
export default function OfficeToPdfWorkspace({ tool }: { tool: OfficeToolId }) {
  const info = OFFICE_TOOLS[tool];
  const [file, setFile] = useState<File | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const controller = useRef<AbortController | null>(null);

  useEffect(
    () => () => {
      controller.current?.abort();
    },
    []
  );

  function choose(next: File) {
    const check = validateOfficeFile(tool, next);
    setOutcome(null);
    if (!check.ok) {
      setFile(null);
      setProblem(check.error);
      return;
    }
    setProblem(null);
    setFile(next);
  }

  function clear() {
    controller.current?.abort();
    setBusy(false);
    setFile(null);
    setProblem(null);
    setOutcome(null);
  }

  async function convert() {
    if (!file) return;
    controller.current?.abort();
    const current = new AbortController();
    controller.current = current;
    setBusy(true);
    setOutcome(null);
    try {
      const blob = await convertOfficeToPdf(tool, file, current.signal);
      if (!current.signal.aborted) setOutcome({ ok: true, blob });
    } catch (error) {
      if (current.signal.aborted) return;
      setOutcome({ ok: false, error: error instanceof Error ? error.message : "Something went wrong. Please try again." });
    } finally {
      if (!current.signal.aborted) setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <SingleFileDrop
        accept={acceptFor(tool)}
        title={info.title}
        hint={`${info.extensions.map((ext) => `.${ext}`).join(" or ")}, up to ${formatBytes(MAX_OFFICE_BYTES)}.`}
        onFile={choose}
        disabled={busy}
      />
      <p className="text-sm text-body">{PRIVACY}</p>

      <div aria-live="polite" className="space-y-3">
        {problem && (
          <p role="alert" className="text-danger">
            {problem}
          </p>
        )}
        {busy && (
          <p role="status" className="text-body">
            Converting… this can take up to a minute for a large file.
          </p>
        )}
      </div>

      {file && (
        <div className="space-y-4">
          <p className="break-words text-heading">
            {file.name} <span className="text-body">({formatBytes(file.size)})</span>
          </p>
          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={() => void convert()} disabled={busy} className="rounded-md bg-primary px-4 py-2 font-medium text-white disabled:opacity-50">
              {busy ? "Converting…" : "Convert to PDF"}
            </button>
            <button type="button" onClick={clear} className="rounded-md border border-line px-4 py-2 font-medium text-heading">
              {busy ? "Cancel" : "Remove file"}
            </button>
          </div>
        </div>
      )}

      <div aria-live="polite" className="space-y-3">
        {outcome && !outcome.ok && (
          <p role="alert" className="text-danger">
            {outcome.error}
          </p>
        )}
        {outcome?.ok && file && (
          <div className="space-y-3">
            <p className="text-success">Done. Your PDF is {formatBytes(outcome.blob.size)}.</p>
            <button type="button" onClick={() => downloadBlob(outcome.blob, pdfFileName(file.name))} className="rounded-md bg-primary px-4 py-2 font-medium text-white">
              Download {pdfFileName(file.name)}
            </button>
          </div>
        )}
      </div>

      <p className="text-sm text-body">{info.note}</p>
    </div>
  );
}