import { useEffect, useRef, useState } from "react";
import FileDrop from "../../components/tools/FileDrop";
import { downloadBlob } from "../../lib/image/downloadBlob";
import { formatBytes } from "../../lib/image/imageCore";
import { baseName, validatePdfFile, type RotateScope } from "../../lib/pdf/pdfCore";
import { DPI_OPTIONS, MAX_RENDER_PAGES, PAGE_FORMATS, pageImageName, renderTargets } from "../../lib/pdf/pdfImage";
import { openPdfForRender, type RenderedPage } from "../../lib/pdf/pdfRender";
import { zipFilesAsBlob } from "../../lib/pdf/zipBlob";

interface Loaded {
  file: File;
  pageCount: number;
}

interface Item {
  name: string;
  number: number; // page number (1 se shuru)
  page: RenderedPage;
}

interface Run {
  id: number;
  file: File;
  key: string;
  total: number;
  items: Item[];
  finished: boolean;
  error: string;
}

const field = "w-full rounded-md border border-line bg-surface px-3 py-2 text-body";

export default function PdfToJpgTool() {
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [problem, setProblem] = useState("");
  const [checking, setChecking] = useState(false);
  const [format, setFormat] = useState(PAGE_FORMATS[0]);
  const [dpi, setDpi] = useState(150);
  const [quality, setQuality] = useState(85);
  const [scope, setScope] = useState<RotateScope>("all");
  const [ranges, setRanges] = useState("");
  const [run, setRun] = useState<Run | null>(null);
  const token = useRef(0);

  // Page chhorne par chalta hua kaam band ho jaye
  useEffect(() => {
    const current = token;
    return () => {
      current.current += 1;
    };
  }, []);

  const settingsKey = `${format?.value}|${dpi}|${quality}|${scope}|${ranges}`;
  const targets = loaded ? renderTargets(scope, ranges, loaded.pageCount) : null;
  const shown = run && loaded && run.file === loaded.file && run.key === settingsKey ? run : null;
  const working = run !== null && !run.finished;

  async function handleFiles(files: File[]) {
    token.current += 1;
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

  async function convert() {
    if (!loaded || !targets || !targets.ok || !format) return;
    token.current += 1;
    const id = token.current;
    const { file } = loaded;
    const key = settingsKey;
    const used = new Set<string>();
    const base = baseName(file.name);
    const update = (change: (run: Run) => Run) => setRun((current) => (current && current.id === id ? change(current) : current));

    setRun({ id, file, key, total: targets.pages.length, items: [], finished: false, error: "" });
    const opened = await openPdfForRender(file);
    if (id !== token.current) {
      if (opened.ok) opened.session.close();
      return;
    }
    if (!opened.ok) return update((r) => ({ ...r, finished: true, error: opened.error }));

    const { session } = opened;
    try {
      for (const index of targets.pages) {
        const result = await session.renderPage(index, dpi, format.value, quality);
        if (id !== token.current) return;
        if (!result.ok) return update((r) => ({ ...r, finished: true, error: result.error }));
        const item: Item = { name: pageImageName(base, index, session.pageCount, format.extension, used), number: index + 1, page: result.page };
        update((r) => ({ ...r, items: [...r.items, item] }));
      }
      update((r) => ({ ...r, finished: true }));
    } finally {
      session.close();
    }
  }

  async function downloadZip() {
    if (!shown || !loaded) return;
    const files = await Promise.all(shown.items.map(async (item) => ({ name: item.name, data: new Uint8Array(await item.page.blob.arrayBuffer()) })));
    downloadBlob(zipFilesAsBlob(files), `${baseName(loaded.file.name)}-images.zip`);
  }

  return (
    <div className="space-y-5">
      <FileDrop accept=".pdf,application/pdf" title="Choose a PDF file, or drop it here" hint="One file at a time." onFiles={(files) => void handleFiles(files)} disabled={working || checking} />
      {checking && <p className="text-sm text-body">Reading the PDF…</p>}
      {problem && <p role="alert" className="text-danger">{problem}</p>}

      {loaded && (
        <>
          <p className="text-sm text-body">
            {loaded.file.name} · {loaded.pageCount} {loaded.pageCount === 1 ? "page" : "pages"} · {formatBytes(loaded.file.size)}
          </p>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-medium text-heading">
              Save pages as
              <select className={`${field} mt-1`} value={format?.value} onChange={(e) => setFormat(PAGE_FORMATS.find((f) => f.value === e.target.value) ?? PAGE_FORMATS[0])}>
                {PAGE_FORMATS.map((f) => (
                  <option key={f.value} value={f.value}>
                    {f.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm font-medium text-heading">
              Resolution
              <select className={`${field} mt-1`} value={dpi} onChange={(e) => setDpi(Number(e.target.value))}>
                {DPI_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            {format?.value === "image/jpeg" && (
              <label className="block text-sm font-medium text-heading">
                Quality: {quality}%
                <input type="range" min={1} max={100} value={quality} onChange={(e) => setQuality(Number(e.target.value))} className="mt-2 w-full accent-primary" />
              </label>
            )}
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
          {targets && !targets.ok && (scope === "all" || ranges.trim() !== "") && <p role="alert" className="text-danger">{targets.error}</p>}
          {targets?.ok && <p className="text-sm text-body">{targets.pages.length} {targets.pages.length === 1 ? "page" : "pages"} will be converted (up to {MAX_RENDER_PAGES} at a time).</p>}

          <button type="button" onClick={() => void convert()} disabled={working || !targets?.ok} className="rounded-md bg-primary px-4 py-2 font-medium text-white disabled:opacity-50">
            {working ? "Converting…" : "Convert PDF"}
          </button>
        </>
      )}

      <div aria-live="polite" className="space-y-3">
        {shown && !shown.finished && (
          <p className="text-sm text-body">
            Converting page {Math.min(shown.items.length + 1, shown.total)} of {shown.total}…
          </p>
        )}
        {shown?.error && <p role="alert" className="text-danger">{shown.error}</p>}
        {shown && shown.finished && !shown.error && shown.items.length > 0 && (
          <p className="text-success">Done. {shown.items.length} {shown.items.length === 1 ? "image is" : "images are"} ready.</p>
        )}
      </div>

      {shown && shown.items.length > 0 && (
        <>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {shown.items.map((item) => (
              <li key={item.name} className="flex items-center gap-3 rounded-lg border border-line p-3">
                <img src={item.page.thumbnail} alt={`Preview of page ${item.number}`} className="h-16 w-auto border border-line bg-white" />
                <div className="min-w-0 flex-1">
                  <p className="break-words text-sm text-heading">{item.name}</p>
                  <p className="text-xs text-body">
                    {item.page.width} × {item.page.height} px · {formatBytes(item.page.blob.size)}
                  </p>
                  <button type="button" onClick={() => downloadBlob(item.page.blob, item.name)} className="mt-1 rounded-md border border-line px-3 py-1 text-sm text-heading">
                    Download
                  </button>
                </div>
              </li>
            ))}
          </ul>
          {shown.finished && shown.items.length > 1 && (
            <button type="button" onClick={() => void downloadZip()} className="rounded-md bg-primary px-4 py-2 font-medium text-white">
              Download all as ZIP
            </button>
          )}
        </>
      )}
    </div>
  );
}