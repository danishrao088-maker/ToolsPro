import { useState } from "react";
import FileDrop from "../../components/tools/FileDrop";
import { useAsyncResult } from "../../hooks/useAsyncResult";
import { downloadBlob } from "../../lib/image/downloadBlob";
import { formatBytes, outputFileName } from "../../lib/image/imageCore";
import { zipFilesAsBlob } from "../../lib/pdf/zipBlob";
import { SPLIT_MODES, baseName, groupLabel, planSplit, validatePdfFile, type SplitMode } from "../../lib/pdf/pdfCore";
import { extractGroups, readPageCount, type PdfBytes } from "../../lib/pdf/pdfOps";

interface Loaded {
  file: File;
  pageCount: number;
}

interface Part {
  name: string;
  bytes: PdfBytes;
  pages: number;
}

type Made = { ok: true; parts: Part[] } | { ok: false; error: string };

const field = "w-full rounded-md border border-line bg-surface px-3 py-2 text-body";

export default function SplitPdfTool() {
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [problem, setProblem] = useState("");
  const [checking, setChecking] = useState(false);
  const [mode, setMode] = useState<SplitMode>("ranges-separate");
  const [ranges, setRanges] = useState("");
  const job = useAsyncResult<Loaded, Made>();
  const [madeWith, setMadeWith] = useState("");

  const settingsKey = `${mode}|${ranges}`;
  const result = job.resultFor(loaded);
  const fresh = result && madeWith === settingsKey ? result : null;
  const plan = loaded ? planSplit(mode, ranges, loaded.pageCount) : null;

  async function handleFiles(files: File[]) {
    job.cancel();
    setLoaded(null);
    const file = files[0];
    if (!file) return;
    const check = validatePdfFile(file);
    if (!check.ok) return setProblem(check.error);
    setProblem("");
    setChecking(true);
    const info = await readPageCount(file);
    setChecking(false);
    if (!info.ok) return setProblem(info.error);
    setLoaded({ file, pageCount: info.pageCount });
  }

  async function split() {
    if (!loaded || !plan || !plan.ok) return;
    const key = settingsKey;
    const groups = plan.groups;
    await job.run(loaded, async (): Promise<Made> => {
      const out = await extractGroups(loaded.file, groups);
      if (!out.ok) return out;
      const used = new Set<string>();
      const base = baseName(loaded.file.name);
      return {
        ok: true,
        parts: out.parts.map((part, index) => ({
          name: outputFileName(`${base}-${groupLabel(groups[index] ?? [])}.pdf`, "pdf", used),
          bytes: part.bytes,
          pages: part.pages,
        })),
      };
    });
    setMadeWith(key);
  }

  function downloadPart(part: Part) {
    downloadBlob(new Blob([part.bytes], { type: "application/pdf" }), part.name);
  }

  function downloadZip() {
    if (!fresh?.ok || !loaded) return;
    downloadBlob(zipFilesAsBlob(fresh.parts.map((p) => ({ name: p.name, data: p.bytes }))), `${baseName(loaded.file.name)}-split.zip`);
  }

  return (
    <div className="space-y-5">
      <FileDrop accept=".pdf,application/pdf" title="Choose a PDF file, or drop it here" hint="One file at a time." onFiles={(files) => void handleFiles(files)} disabled={job.busy || checking} />
      {checking && <p className="text-sm text-body">Reading the PDF…</p>}
      {problem && <p role="alert" className="text-danger">{problem}</p>}

      {loaded && (
        <>
          <p className="text-sm text-body">
            {loaded.file.name} · {loaded.pageCount} {loaded.pageCount === 1 ? "page" : "pages"} · {formatBytes(loaded.file.size)}
          </p>
          <label className="block text-sm font-medium text-heading">
            How to split
            <select className={`${field} mt-1`} value={mode} onChange={(e) => setMode(e.target.value as SplitMode)}>
              {SPLIT_MODES.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </label>
          {mode !== "every-page" && (
            <label className="block text-sm font-medium text-heading">
              Pages
              <input className={`${field} mt-1`} value={ranges} onChange={(e) => setRanges(e.target.value)} placeholder="1-3, 5, 8-" />
              <span className="mt-1 block text-xs font-normal text-body">Separate pages and ranges with commas. "8-" means page 8 to the end.</span>
            </label>
          )}
          {plan && !plan.ok && ranges.trim() !== "" && <p role="alert" className="text-danger">{plan.error}</p>}
          {plan?.ok && <p className="text-sm text-body">This will create {plan.groups.length} {plan.groups.length === 1 ? "PDF" : "PDFs"}.</p>}

          <button type="button" onClick={() => void split()} disabled={job.busy || !plan?.ok} className="rounded-md bg-primary px-4 py-2 font-medium text-white disabled:opacity-50">
            {job.busy ? "Splitting…" : "Split PDF"}
          </button>
        </>
      )}

      <div aria-live="polite">
        {fresh && !fresh.ok && <p role="alert" className="text-danger">{fresh.error}</p>}
        {fresh?.ok && (
          <div className="space-y-3">
            <p className="text-success">Done. Your {fresh.parts.length === 1 ? "PDF is" : `${fresh.parts.length} PDFs are`} ready.</p>
            <ul className="divide-y divide-line rounded-lg border border-line">
              {fresh.parts.map((part) => (
                <li key={part.name} className="flex items-center gap-3 p-3">
                  <span className="flex-1 break-words text-sm text-heading">
                    {part.name} <span className="text-body">({part.pages} {part.pages === 1 ? "page" : "pages"}, {formatBytes(part.bytes.length)})</span>
                  </span>
                  <button type="button" onClick={() => downloadPart(part)} className="rounded-md border border-line px-3 py-1 text-sm text-heading">
                    Download
                  </button>
                </li>
              ))}
            </ul>
            {fresh.parts.length > 1 && (
              <button type="button" onClick={downloadZip} className="rounded-md bg-primary px-4 py-2 font-medium text-white">
                Download all as ZIP
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}