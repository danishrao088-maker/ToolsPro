import { useState } from "react";
import SingleFileDrop from "../../components/tools/SingleFileDrop";
import { useAsyncResult } from "../../hooks/useAsyncResult";
import { bytesToDataUrl } from "../../lib/image/dataUrl";
import { downloadBlob } from "../../lib/image/downloadBlob";
import { APPLE_SIZE, FIT_OPTIONS, HEAD_SNIPPET, ICO_SIZES, PNG_FILES, validateIconSource, type FitMode } from "../../lib/image/favicon";
import { loadIconSource, renderIcon } from "../../lib/image/faviconRender";
import { formatBytes } from "../../lib/image/imageCore";
import { buildIco } from "../../lib/image/ico";
import { buildZip } from "../../lib/image/zip";

interface Source {
  file: File;
  isSvg: boolean;
}

interface IconFile {
  name: string;
  data: Uint8Array<ArrayBuffer>;
  mime: string;
  preview: string;
}

type Made = { ok: true; files: IconFile[] } | { ok: false; error: string };

const field = "w-full rounded-md border border-line bg-surface px-3 py-2 text-body";

export default function FaviconGeneratorTool() {
  const [source, setSource] = useState<Source | null>(null);
  const [problem, setProblem] = useState("");
  const [mode, setMode] = useState<FitMode>("fit");
  const [appleColor, setAppleColor] = useState("#ffffff");
  const [madeWith, setMadeWith] = useState("");
  const [copied, setCopied] = useState(false);
  const job = useAsyncResult<Source, Made>();

  const settingsKey = `${mode}|${appleColor}`;
  const result = job.resultFor(source);
  const fresh = result && madeWith === settingsKey ? result : null;

  function handleFile(file: File) {
    job.cancel();
    const check = validateIconSource(file);
    if (!check.ok) {
      setSource(null);
      setProblem(check.error);
      return;
    }
    setProblem("");
    setSource({ file, isSvg: check.type === "image/svg+xml" });
  }

  async function generate() {
    if (!source) return;
    const key = settingsKey;
    await job.run(source, async (): Promise<Made> => {
      const loaded = await loadIconSource(source.file, source.isSvg);
      if (!loaded.ok) return loaded;
      try {
        const png = new Map<number, Uint8Array<ArrayBuffer>>();
        const sizes = new Set<number>([...ICO_SIZES, ...PNG_FILES.map((f) => f.size)]);
        for (const size of sizes) {
          const bytes = await renderIcon(loaded.source, size, mode, size === APPLE_SIZE ? appleColor : null);
          if (!bytes) return { ok: false, error: "Your browser could not create the icons. Try a smaller image." };
          png.set(size, bytes);
        }
        const ico = buildIco(ICO_SIZES.map((size) => ({ size, data: png.get(size) ?? new Uint8Array(0) })));
        const files: IconFile[] = [
          { name: "favicon.ico", data: ico, mime: "image/x-icon", preview: bytesToDataUrl(png.get(48) ?? new Uint8Array(0), "image/png") },
          ...PNG_FILES.map((spec) => {
            const data = png.get(spec.size) ?? new Uint8Array(0);
            return { name: spec.name, data, mime: "image/png", preview: bytesToDataUrl(data, "image/png") };
          }),
        ];
        return { ok: true, files };
      } finally {
        loaded.source.close();
      }
    });
    setMadeWith(key);
  }

  function downloadOne(file: IconFile) {
    downloadBlob(new Blob([file.data], { type: file.mime }), file.name);
  }

  function downloadZip() {
    if (!fresh?.ok) return;
    const zip = buildZip(fresh.files.map((f) => ({ name: f.name, data: f.data })));
    downloadBlob(new Blob([zip], { type: "application/zip" }), "favicons.zip");
  }

  async function copySnippet() {
    try {
      await navigator.clipboard.writeText(HEAD_SNIPPET);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="space-y-5">
      <SingleFileDrop
        accept=".svg,.jpg,.jpeg,.png,.webp,.gif,.bmp,.avif,image/*"
        title="Choose your logo, or drop it here"
        hint="A square PNG or SVG works best. One file at a time."
        onFile={handleFile}
        disabled={job.busy}
      />
      {problem && <p role="alert" className="text-danger">{problem}</p>}

      {source && (
        <>
          <p className="text-sm text-body">Selected: {source.file.name} ({formatBytes(source.file.size)})</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-medium text-heading">
              How to place the picture
              <select className={`${field} mt-1`} value={mode} onChange={(e) => setMode(e.target.value as FitMode)}>
                {FIT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm font-medium text-heading">
              Background for the Apple icon
              <input type="color" value={appleColor} onChange={(e) => setAppleColor(e.target.value)} className="mt-1 block h-10 w-20 rounded border border-line" />
              <span className="mt-1 block text-xs font-normal text-body">Apple icons cannot be transparent. The other icons keep a transparent background.</span>
            </label>
          </div>
          <button
            type="button"
            onClick={() => void generate()}
            disabled={job.busy}
            className="rounded-md bg-primary px-4 py-2 font-medium text-white disabled:opacity-50"
          >
            {job.busy ? "Creating…" : "Create favicons"}
          </button>
        </>
      )}

      <div aria-live="polite">{fresh && !fresh.ok && <p role="alert" className="text-danger">{fresh.error}</p>}</div>

      {fresh?.ok && (
        <>
          <ul className="divide-y divide-line rounded-lg border border-line">
            {fresh.files.map((file) => (
              <li key={file.name} className="flex items-center gap-3 p-3">
                <img src={file.preview} alt="" className="h-10 w-10 bg-surface-muted object-contain" />
                <span className="flex-1 text-sm text-heading">
                  {file.name} <span className="text-body">({formatBytes(file.data.length)})</span>
                </span>
                <button type="button" onClick={() => downloadOne(file)} className="rounded-md border border-line px-3 py-1 text-sm text-heading">
                  Download
                </button>
              </li>
            ))}
          </ul>
          <button type="button" onClick={downloadZip} className="rounded-md bg-primary px-4 py-2 font-medium text-white">
            Download all as ZIP
          </button>

          <div>
            <h2 className="mb-2 font-semibold text-heading">Add this to the &lt;head&gt; of your pages</h2>
            <pre className="overflow-x-auto rounded-md border border-line bg-surface-muted p-3 text-sm text-body">{HEAD_SNIPPET}</pre>
            <button type="button" onClick={() => void copySnippet()} className="mt-2 rounded-md border border-line px-3 py-1 text-sm text-heading">
              {copied ? "Copied" : "Copy code"}
            </button>
            <p className="mt-2 text-sm text-body">Upload the files to the root folder of your website so these addresses work.</p>
          </div>
        </>
      )}
    </div>
  );
}