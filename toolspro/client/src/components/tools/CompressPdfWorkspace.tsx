import { useEffect, useRef, useState } from "react";
import { downloadBlob } from "../../lib/image/downloadBlob";
import { describeChange, formatBytes } from "../../lib/image/imageCore";
import { LEVELS, compressPdf, type CompressLevel, type CompressOutcome, type CompressProgress, type CompressRequest, type PageRenderer } from "../../lib/pdf/pdfCompress";
import { baseName, validatePdfFile } from "../../lib/pdf/pdfCore";
import { openPdfForRender } from "../../lib/pdf/pdfRender";
import FileDrop from "./FileDrop";

export type CompressMode = { kind: "level" } | { kind: "target"; targetBytes: number; label: string };

interface Loaded {
  file: File;
  pageCount: number;
}

interface Run {
  id: number;
  file: File;
  working: boolean;
  progress: CompressProgress | null;
  outcome: CompressOutcome | null;
}

// Compress PDF ke sab tools ka ek jaisa dhancha. Kaam poora browser mein hota hai, file kahin nahi jati.
export default function CompressPdfWorkspace({ mode }: { mode: CompressMode }) {
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [problem, setProblem] = useState("");
  const [checking, setChecking] = useState(false);
  const [level, setLevel] = useState<CompressLevel>("balanced");
  const [run, setRun] = useState<Run | null>(null);
  const token = useRef(0);
  const controller = useRef<AbortController | null>(null);

  // Page chhorne par chalta hua kaam band ho jaye
  useEffect(() => {
    const currentToken = token;
    const currentController = controller;
    return () => {
      currentToken.current += 1;
      currentController.current?.abort();
    };
  }, []);

  async function handleFiles(files: File[]) {
    token.current += 1;
    controller.current?.abort();
    setRun(null);
    setLoaded(null);
    const file = files[0];
    if (!file) return;
    const check = validatePdfFile(file);
    if (!check.ok) return setProblem(check.error);
    setProblem("");
    setChecking(true);
    const opened = await openPdfForRender(file);
    setChecking(false);
    if (!opened.ok) return setProblem(opened.error);
    const pageCount = opened.session.pageCount;
    opened.session.close();
    setLoaded({ file, pageCount });
  }

  async function compress() {
    if (!loaded) return;
    token.current += 1;
    const id = token.current;
    controller.current?.abort();
    const abort = new AbortController();
    controller.current = abort;
    const { file } = loaded;
    const update = (change: (current: Run) => Run) => setRun((current) => (current && current.id === id ? change(current) : current));

    setRun({ id, file, working: true, progress: null, outcome: null });
    const opened = await openPdfForRender(file);
    if (id !== token.current) {
      if (opened.ok) opened.session.close();
      return;
    }
    if (!opened.ok) return update((r) => ({ ...r, working: false, outcome: { ok: false, error: opened.error, cancelled: false } }));

    const { session } = opened;
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const render: PageRenderer = async (index, dpi, quality) => {
        const result = await session.renderPage(index, dpi, "image/jpeg", quality);
        if (!result.ok) return { ok: false, error: result.error };
        const jpeg = new Uint8Array(await result.page.blob.arrayBuffer());
        return { ok: true, image: { jpeg, width: result.page.width, height: result.page.height } };
      };
      const request: CompressRequest = mode.kind === "level" ? { kind: "level", level } : { kind: "target", targetBytes: mode.targetBytes };
      const outcome = await compressPdf({ bytes, pageCount: session.pageCount, render, signal: abort.signal, onProgress: (progress) => update((r) => ({ ...r, progress })) }, request);
      if (id !== token.current) return;
      update((r) => ({ ...r, working: false, outcome }));
    } finally {
      session.close();
    }
  }

  function download(outcome: Extract<CompressOutcome, { ok: true }>, file: File) {
    downloadBlob(new Blob([outcome.bytes.slice()], { type: "application/pdf" }), `${baseName(file.name)}-compressed.pdf`);
  }

  const shown = run && loaded && run.file === loaded.file ? run : null;
  const working = shown?.working === true;
  const outcome = shown?.outcome ?? null;

  return (
    <div className="space-y-5">
      <FileDrop accept=".pdf,application/pdf" title="Choose a PDF file, or drop it here" hint="One file at a time, up to 50 MB." onFiles={(files) => void handleFiles(files)} disabled={working || checking} />
      {checking && <p className="text-sm text-body">Reading the PDF…</p>}
      {problem && (
        <p role="alert" className="text-danger">
          {problem}
        </p>
      )}

      {loaded && (
        <>
          <p className="text-sm text-body">
            {loaded.file.name} · {loaded.pageCount} {loaded.pageCount === 1 ? "page" : "pages"} · {formatBytes(loaded.file.size)}
          </p>

          {mode.kind === "level" ? (
            <fieldset className="space-y-2" disabled={working}>
              <legend className="text-sm font-medium text-heading">How much to compress</legend>
              {LEVELS.map((item) => (
                <label key={item.value} className="flex items-start gap-2 text-body">
                  <input type="radio" name="compress-level" className="mt-1" checked={level === item.value} onChange={() => setLevel(item.value)} />
                  <span>
                    <span className="font-medium text-heading">{item.label}</span>
                    <span className="block text-sm">{item.hint}</span>
                  </span>
                </label>
              ))}
            </fieldset>
          ) : (
            <p className="text-body">
              Goal: make this PDF smaller than <strong className="text-heading">{mode.label}</strong>.
            </p>
          )}

          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={() => void compress()} disabled={working} className="rounded-md bg-primary px-4 py-2 font-medium text-white disabled:opacity-50">
              {working ? "Compressing…" : "Compress PDF"}
            </button>
            {working && (
              <button type="button" onClick={() => controller.current?.abort()} className="rounded-md border border-line px-4 py-2 font-medium text-heading">
                Stop
              </button>
            )}
          </div>
        </>
      )}

      <div aria-live="polite" className="space-y-3">
        {working && (
          <p role="status" className="text-body">
            {shown?.progress ? `Pass ${shown.progress.attempt}: page ${shown.progress.page} of ${shown.progress.pages}. ` : "Starting. "}
            {mode.kind === "target" ? "The tool tries a few sizes to find the best one that fits." : "This can take a little while for long PDFs."}
          </p>
        )}
        {outcome && !outcome.ok && (
          <p role={outcome.cancelled ? "status" : "alert"} className={outcome.cancelled ? "text-body" : "text-danger"}>
            {outcome.error}
          </p>
        )}
        {outcome && outcome.ok && shown && (
          <section className="space-y-3 rounded-lg border border-line p-4">
            <h3 className="text-base font-semibold text-heading">{outcome.method === "unchanged" ? "No change needed" : "Your PDF is ready"}</h3>
            <p className="text-body">
              {formatBytes(outcome.beforeBytes)} → <strong className="text-heading">{formatBytes(outcome.afterBytes)}</strong>
              {outcome.method !== "unchanged" && ` (${describeChange(outcome.beforeBytes, outcome.afterBytes)})`}
            </p>
            {mode.kind === "target" && outcome.reachedTarget === true && outcome.method !== "unchanged" && <p className="text-success">The file is now under {mode.label}.</p>}
            {mode.kind === "target" && outcome.reachedTarget === false && (
              <p className="text-danger">
                We could not get this PDF under {mode.label}. This is the smallest version we could make. Try a PDF with fewer pages, or a larger size goal.
              </p>
            )}
            <ul className="list-disc space-y-1 pl-5 text-sm text-body">
              {outcome.notes.map((note) => (
                <li key={note}>{note}</li>
              ))}
            </ul>
            {outcome.method !== "unchanged" && (
              <button type="button" onClick={() => download(outcome, shown.file)} className="rounded-md bg-primary px-4 py-2 font-medium text-white">
                Download compressed PDF
              </button>
            )}
          </section>
        )}
      </div>
    </div>
  );
}