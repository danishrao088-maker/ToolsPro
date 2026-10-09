import { useState } from "react";
import FileDrop from "../../components/tools/FileDrop";
import { useAsyncResult } from "../../hooks/useAsyncResult";
import { downloadBlob } from "../../lib/image/downloadBlob";
import { formatBytes } from "../../lib/image/imageCore";
import { ROTATE_ANGLES, baseName, rotationTargets, validatePdfFile, type RotateAngle, type RotateScope } from "../../lib/pdf/pdfCore";
import { readPageCount, rotatePdf, type SavedPdf } from "../../lib/pdf/pdfOps";

interface Loaded {
  file: File;
  pageCount: number;
}

const field = "w-full rounded-md border border-line bg-surface px-3 py-2 text-body";

export default function RotatePdfTool() {
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [problem, setProblem] = useState("");
  const [checking, setChecking] = useState(false);
  const [angle, setAngle] = useState<RotateAngle>(90);
  const [scope, setScope] = useState<RotateScope>("all");
  const [ranges, setRanges] = useState("");
  const job = useAsyncResult<Loaded, SavedPdf>();
  const [madeWith, setMadeWith] = useState("");

  const settingsKey = `${angle}|${scope}|${ranges}`;
  const result = job.resultFor(loaded);
  const fresh = result && madeWith === settingsKey ? result : null;
  const targets = loaded ? rotationTargets(scope, ranges, loaded.pageCount) : null;

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

  async function rotate() {
    if (!loaded || !targets || !targets.ok) return;
    const key = settingsKey;
    await job.run(loaded, () => rotatePdf(loaded.file, targets.pages, angle));
    setMadeWith(key);
  }

  function download() {
    if (fresh?.ok && loaded) downloadBlob(new Blob([fresh.bytes], { type: "application/pdf" }), `${baseName(loaded.file.name)}-rotated.pdf`);
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
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-medium text-heading">
              Rotate by
              <select className={`${field} mt-1`} value={angle} onChange={(e) => setAngle(Number(e.target.value) as RotateAngle)}>
                {ROTATE_ANGLES.map((a) => (
                  <option key={a.value} value={a.value}>
                    {a.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm font-medium text-heading">
              Which pages
              <select className={`${field} mt-1`} value={scope} onChange={(e) => setScope(e.target.value as RotateScope)}>
                <option value="all">All pages</option>
                <option value="range">Only the pages I choose</option>
              </select>
            </label>
          </div>
          {scope === "range" && (
            <label className="block text-sm font-medium text-heading">
              Pages
              <input className={`${field} mt-1`} value={ranges} onChange={(e) => setRanges(e.target.value)} placeholder="1-3, 5, 8-" />
            </label>
          )}
          {targets && !targets.ok && ranges.trim() !== "" && <p role="alert" className="text-danger">{targets.error}</p>}
          {targets?.ok && <p className="text-sm text-body">{targets.pages.length} {targets.pages.length === 1 ? "page" : "pages"} will be rotated.</p>}

          <button type="button" onClick={() => void rotate()} disabled={job.busy || !targets?.ok} className="rounded-md bg-primary px-4 py-2 font-medium text-white disabled:opacity-50">
            {job.busy ? "Rotating…" : "Rotate PDF"}
          </button>
        </>
      )}

      <div aria-live="polite">
        {fresh && !fresh.ok && <p role="alert" className="text-danger">{fresh.error}</p>}
        {fresh?.ok && (
          <div className="space-y-3">
            <p className="text-success">Done. Your rotated PDF is ready ({formatBytes(fresh.bytes.length)}).</p>
            <button type="button" onClick={download} className="rounded-md bg-primary px-4 py-2 font-medium text-white">
              Download rotated PDF
            </button>
          </div>
        )}
      </div>
    </div>
  );
}