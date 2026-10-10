import { useEffect, useRef, useState } from "react";
import SingleFileDrop from "../../components/tools/SingleFileDrop";
import { downloadBlob } from "../../lib/image/downloadBlob";
import { formatBytes, validateImageFile } from "../../lib/image/imageCore";
import { MAX_OCR_BYTES, OCR_LANGUAGES, confidenceLabel, findLanguage, textFileName, textStats } from "../../lib/ocr/ocrCore";
import { startOcr, type OcrJob } from "../../lib/ocr/ocrRun";

interface Run {
  id: number;
  file: File;
  language: string;
  stage: string;
  percent: number | null;
  finished: boolean;
  error: string;
  text: string;
  confidence: number;
}

const field = "w-full rounded-md border border-line bg-surface px-3 py-2 text-body";

export default function ImageToTextTool() {
  const [file, setFile] = useState<File | null>(null);
  const [problem, setProblem] = useState("");
  const [language, setLanguage] = useState(OCR_LANGUAGES[0]?.code ?? "eng");
  const [run, setRun] = useState<Run | null>(null);
  const [edited, setEdited] = useState<{ id: number; text: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const job = useRef<OcrJob | null>(null);
  const counter = useRef(0);

  // Page chhorne par chalta hua kaam band ho jaye
  useEffect(() => {
    const current = job;
    return () => current.current?.cancel();
  }, []);

  const working = run !== null && !run.finished;
  const shown = run && file && run.file === file && run.language === language ? run : null;
  const text = shown && edited && edited.id === shown.id ? edited.text : (shown?.text ?? "");

  function choose(selected: File | null) {
    job.current?.cancel();
    job.current = null;
    setRun(null);
    setEdited(null);
    setCopied(false);
    if (!selected) return setFile(null);
    const check = validateImageFile(selected);
    if (!check.ok) {
      setFile(null);
      return setProblem(check.error);
    }
    if (selected.size > MAX_OCR_BYTES) {
      setFile(null);
      return setProblem(`"${selected.name}" is too large. The maximum is ${formatBytes(MAX_OCR_BYTES)}.`);
    }
    setProblem("");
    setFile(selected);
  }

  async function extract() {
    if (!file) return;
    job.current?.cancel();
    counter.current += 1;
    const id = counter.current;
    const current: Run = { id, file, language, stage: "Getting ready", percent: null, finished: false, error: "", text: "", confidence: 0 };
    setRun(current);
    setEdited(null);
    setCopied(false);

    const started = startOcr(file, language, (stage, percent) => {
      setRun((existing) => (existing && existing.id === id && !existing.finished ? { ...existing, stage, percent } : existing));
    });
    job.current = started;
    const outcome = await started.result;
    if (counter.current !== id) return;
    setRun((existing) =>
      existing && existing.id === id
        ? outcome.ok
          ? { ...existing, finished: true, text: outcome.text, confidence: outcome.confidence }
          : { ...existing, finished: true, error: outcome.error }
        : existing
    );
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  const stats = textStats(text);
  const rtl = findLanguage(language).rtl;

  return (
    <div className="space-y-5">
      <SingleFileDrop accept="image/jpeg,image/png,image/webp,image/gif,image/bmp,image/avif,.jpg,.jpeg,.png,.webp,.gif,.bmp,.avif" title="Choose a picture, or drop it here" hint="A clear photo or screenshot with printed text works best." onFile={choose} disabled={working} />
      {problem && <p role="alert" className="text-danger">{problem}</p>}

      {file && (
        <>
          <p className="text-sm text-body">
            {file.name} · {formatBytes(file.size)}
          </p>
          <label className="block max-w-xs text-sm font-medium text-heading">
            Language of the text
            <select className={`${field} mt-1`} value={language} onChange={(e) => setLanguage(e.target.value)} disabled={working}>
              {OCR_LANGUAGES.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.label}
                </option>
              ))}
            </select>
          </label>
          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={() => void extract()} disabled={working} className="rounded-md bg-primary px-4 py-2 font-medium text-white disabled:opacity-50">
              {working ? "Reading…" : "Extract text"}
            </button>
            {working && (
              <button type="button" onClick={() => choose(null)} className="rounded-md border border-line px-4 py-2 font-medium text-heading">
                Stop
              </button>
            )}
          </div>
          <p className="text-sm text-body">The first time can take longer, because the language data has to load. Choose the language that matches the text in the picture.</p>
        </>
      )}

      <div aria-live="polite" className="space-y-3">
        {shown && !shown.finished && (
          <p className="text-sm text-body">
            {shown.stage}
            {shown.percent !== null ? `… ${shown.percent}%` : "…"}
          </p>
        )}
        {shown?.error && <p role="alert" className="text-danger">{shown.error}</p>}
        {shown && shown.finished && !shown.error && stats.words === 0 && <p className="text-body">No text was found. Try a clearer or bigger picture, or check the language.</p>}
      </div>

      {shown && shown.finished && !shown.error && stats.words > 0 && (
        <div className="space-y-3">
          <p className="text-sm text-body">
            {stats.words} words · {stats.characters} characters. {confidenceLabel(shown.confidence)}
          </p>
          <label className="block text-sm font-medium text-heading">
            Text (you can edit it here)
            <textarea
              className={`${field} mt-1 min-h-64 font-sans`}
              dir={rtl ? "rtl" : "ltr"}
              value={text}
              onChange={(e) => setEdited({ id: shown.id, text: e.target.value })}
            />
          </label>
          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={() => void copy()} className="rounded-md bg-primary px-4 py-2 font-medium text-white">
              {copied ? "Copied" : "Copy text"}
            </button>
            <button
              type="button"
              onClick={() => downloadBlob(new Blob([text], { type: "text/plain;charset=utf-8" }), textFileName(shown.file.name))}
              className="rounded-md border border-line px-4 py-2 font-medium text-heading"
            >
              Download .txt
            </button>
          </div>
        </div>
      )}
    </div>
  );
}