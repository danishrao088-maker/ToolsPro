import { useMemo, useState } from "react";
import SingleFileDrop from "../../components/tools/SingleFileDrop";
import { useAsyncResult } from "../../hooks/useAsyncResult";
import { svgToDataUrl } from "../../lib/image/dataUrl";
import { downloadBlob } from "../../lib/image/downloadBlob";
import { MAX_SVG_BYTES, prepareSvg, svgOutputSize } from "../../lib/image/svgSize";
import { OUTPUT_FORMATS, formatBytes, getOutputFormat, outputFileName, qualityValue, type OutputMime } from "../../lib/image/imageCore";
import { renderSvg } from "../../lib/image/svgRender";

interface LoadedSvg {
  name: string;
  text: string;
  width: number;
  height: number;
}

type Loaded = { ok: true; svg: LoadedSvg } | { ok: false; error: string };
type Rendered = { ok: true; blob: Blob; width: number; height: number } | { ok: false; error: string };

const WIDTHS = [
  { value: "original", label: "Original size" },
  { value: "256", label: "256 px wide" },
  { value: "512", label: "512 px wide" },
  { value: "1024", label: "1024 px wide" },
  { value: "2048", label: "2048 px wide" },
  { value: "4096", label: "4096 px wide" },
];

const field = "w-full rounded-md border border-line bg-surface px-3 py-2 text-body";

export default function SvgConverterTool() {
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [mime, setMime] = useState<OutputMime>("image/png");
  const [width, setWidth] = useState("1024");
  const [quality, setQuality] = useState(90);
  const [transparent, setTransparent] = useState(true);
  const [color, setColor] = useState("#ffffff");
  const job = useAsyncResult<LoadedSvg, Rendered>();

  const svg = loaded?.ok ? loaded.svg : null;
  const format = getOutputFormat(mime);
  const transparencyPossible = mime !== "image/jpeg"; // JPG mein transparency nahi hoti
  const targetWidth = width === "original" ? null : Number(width);
  const size = useMemo(() => (svg ? svgOutputSize(svg, targetWidth) : null), [svg, targetWidth]);
  const preview = useMemo(() => (svg ? svgToDataUrl(svg.text) : ""), [svg]);

  // Natija sirf tab dikhao jab wo isi file ke liye bana ho aur settings nahi badli
  const [madeWith, setMadeWith] = useState("");
  const settingsKey = `${mime}|${width}|${quality}|${transparent}|${color}`;
  const result = job.resultFor(svg);
  const fresh = result && madeWith === settingsKey ? result : null;

  async function handleFile(file: File) {
    job.cancel();
    if (file.size === 0) return setLoaded({ ok: false, error: `"${file.name}" is empty.` });
    if (file.size > MAX_SVG_BYTES) return setLoaded({ ok: false, error: `"${file.name}" is too large. The maximum is ${formatBytes(MAX_SVG_BYTES)}.` });
    const prepared = prepareSvg(await file.text());
    if (!prepared.ok) return setLoaded({ ok: false, error: prepared.error });
    setLoaded({ ok: true, svg: { name: file.name, text: prepared.text, width: prepared.width, height: prepared.height } });
  }

  async function convert() {
    if (!svg || !size || !size.ok) return;
    const key = settingsKey;
    const background = transparencyPossible && transparent ? null : color;
    await job.run(svg, async (): Promise<Rendered> => {
      const made = await renderSvg(svg.text, size.width, size.height, mime, qualityValue(quality), background);
      return made.ok ? { ok: true, blob: made.blob, width: size.width, height: size.height } : made;
    });
    setMadeWith(key);
  }

  function download() {
    if (!fresh || !fresh.ok || !svg || !format) return;
    downloadBlob(fresh.blob, outputFileName(svg.name, format.extension, new Set()));
  }

  return (
    <div className="space-y-5">
      <SingleFileDrop
        accept=".svg,image/svg+xml"
        title="Choose an SVG file, or drop it here"
        hint={`One file at a time, up to ${formatBytes(MAX_SVG_BYTES)}.`}
        onFile={(file) => void handleFile(file)}
        disabled={job.busy}
      />

      {loaded && !loaded.ok && (
        <p role="alert" className="text-danger">
          {loaded.error}
        </p>
      )}

      {svg && (
        <>
          <div className="flex flex-col items-center gap-2 rounded-lg border border-line bg-surface-muted p-4">
            <img src={preview} alt={`Preview of ${svg.name}`} className="max-h-64 max-w-full bg-white" />
            <p className="text-sm text-body">
              {svg.name} · {Math.round(svg.width)} × {Math.round(svg.height)} px
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-medium text-heading">
              Save as
              <select className={`${field} mt-1`} value={mime} onChange={(e) => setMime(e.target.value as OutputMime)}>
                {OUTPUT_FORMATS.map((f) => (
                  <option key={f.mime} value={f.mime}>
                    {f.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm font-medium text-heading">
              Size
              <select className={`${field} mt-1`} value={width} onChange={(e) => setWidth(e.target.value)}>
                {WIDTHS.map((w) => (
                  <option key={w.value} value={w.value}>
                    {w.label}
                  </option>
                ))}
              </select>
            </label>
            {format?.lossy && (
              <label className="block text-sm font-medium text-heading">
                Quality: {quality}%
                <input type="range" min={1} max={100} value={quality} onChange={(e) => setQuality(Number(e.target.value))} className="mt-2 w-full accent-primary" />
              </label>
            )}
            <div className="space-y-2">
              {transparencyPossible && (
                <label className="flex items-center gap-2 text-sm text-body">
                  <input type="checkbox" checked={transparent} onChange={(e) => setTransparent(e.target.checked)} className="accent-primary" />
                  Keep the background transparent
                </label>
              )}
              {(!transparencyPossible || !transparent) && (
                <label className="block text-sm font-medium text-heading">
                  Background colour
                  <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="mt-1 block h-10 w-20 rounded border border-line" />
                </label>
              )}
            </div>
          </div>

          {size && (size.ok ? <p className="text-sm text-body">The image will be {size.width} × {size.height} px.</p> : <p role="alert" className="text-danger">{size.error}</p>)}

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => void convert()}
              disabled={job.busy || !size?.ok}
              className="rounded-md bg-primary px-4 py-2 font-medium text-white disabled:opacity-50"
            >
              {job.busy ? "Converting…" : "Convert SVG"}
            </button>
            {fresh?.ok && (
              <button type="button" onClick={download} className="rounded-md border border-line px-4 py-2 font-medium text-heading">
                Download {format?.label} ({formatBytes(fresh.blob.size)})
              </button>
            )}
          </div>

          <div aria-live="polite">
            {fresh && !fresh.ok && <p role="alert" className="text-danger">{fresh.error}</p>}
            {fresh?.ok && <p className="text-success">Done. Your {fresh.width} × {fresh.height} px image is ready.</p>}
          </div>
        </>
      )}
    </div>
  );
}