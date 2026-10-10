import { useRef, useState } from "react";
import FileDrop from "../../components/tools/FileDrop";
import { downloadBlob } from "../../lib/image/downloadBlob";
import { formatBytes, outputFileName } from "../../lib/image/imageCore";
import { buildZipCompressed, type PackedEntry } from "../../lib/image/zip";
import { MAX_PDF_FILES, MAX_TOTAL_BYTES, baseName, hasPdfHeader, moveItem, totalSize, validatePdfFile } from "../../lib/pdf/pdfCore";

interface Item {
  id: number;
  file: File;
}

type Made = { ok: true; blob: Blob; entries: PackedEntry[]; zipName: string } | { ok: false; error: string };

const small = "rounded-md border border-line px-2 py-1 text-sm text-heading disabled:opacity-40";

export default function PdfToZipTool() {
  const [items, setItems] = useState<Item[]>([]);
  const [problems, setProblems] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [made, setMade] = useState<{ items: Item[]; result: Made } | null>(null);
  const nextId = useRef(1);

  const result = made && made.items === items ? made.result : null;
  const total = totalSize(items.map((item) => item.file));

  function addFiles(files: File[]) {
    const notes: string[] = [];
    const accepted: Item[] = [];
    let count = items.length;
    let bytes = total;
    for (const file of files) {
      const check = validatePdfFile(file);
      if (!check.ok) notes.push(check.error);
      else if (count >= MAX_PDF_FILES) notes.push(`"${file.name}" was not added. You can add up to ${MAX_PDF_FILES} files at a time.`);
      else if (bytes + file.size > MAX_TOTAL_BYTES) notes.push(`"${file.name}" was not added. The files together can be at most ${formatBytes(MAX_TOTAL_BYTES)}.`);
      else {
        accepted.push({ id: nextId.current, file });
        nextId.current += 1;
        count += 1;
        bytes += file.size;
      }
    }
    setProblems(notes);
    if (accepted.length > 0) setItems((current) => [...current, ...accepted]);
  }

  function change(next: Item[]) {
    setProblems([]);
    setItems(next);
  }

  async function createZip() {
    const snapshot = items;
    setBusy(true);
    let outcome: Made;
    try {
      const used = new Set<string>();
      const files: { name: string; data: Uint8Array }[] = [];
      for (const item of snapshot) {
        const bytes = new Uint8Array(await item.file.arrayBuffer());
        if (!hasPdfHeader(bytes)) {
          setMade({ items: snapshot, result: { ok: false, error: `"${item.file.name}" does not look like a PDF file.` } });
          return;
        }
        files.push({ name: outputFileName(item.file.name, "pdf", used), data: bytes });
      }
      const zip = await buildZipCompressed(files);
      const only = snapshot.length === 1 ? snapshot[0] : undefined;
      outcome = {
        ok: true,
        blob: new Blob([zip.bytes], { type: "application/zip" }),
        entries: zip.entries,
        zipName: only ? `${baseName(only.file.name)}.zip` : "pdf-files.zip",
      };
    } catch {
      outcome = { ok: false, error: "The ZIP file could not be created. A file may be damaged, or your browser may be out of memory." };
    } finally {
      setBusy(false);
    }
    setMade({ items: snapshot, result: outcome });
  }

  return (
    <div className="space-y-5">
      <FileDrop
        accept=".pdf,application/pdf"
        multiple
        title="Choose PDF files, or drop them here"
        hint={`Up to ${MAX_PDF_FILES} files. They are put together in one ZIP file.`}
        onFiles={addFiles}
        disabled={busy}
      />

      {problems.length > 0 && (
        <ul role="alert" className="list-disc space-y-1 pl-5 text-danger">
          {problems.map((problem) => (
            <li key={problem}>{problem}</li>
          ))}
        </ul>
      )}

      {items.length > 0 && (
        <>
          <ol className="divide-y divide-line rounded-lg border border-line">
            {items.map((item, index) => (
              <li key={item.id} className="flex flex-wrap items-center gap-2 p-3">
                <span className="min-w-0 flex-1 break-words text-sm text-heading">
                  {item.file.name} <span className="text-body">({formatBytes(item.file.size)})</span>
                </span>
                <button type="button" className={small} disabled={busy || index === 0} onClick={() => change(moveItem(items, index, index - 1))} aria-label={`Move ${item.file.name} up`}>
                  Up
                </button>
                <button type="button" className={small} disabled={busy || index === items.length - 1} onClick={() => change(moveItem(items, index, index + 1))} aria-label={`Move ${item.file.name} down`}>
                  Down
                </button>
                <button type="button" className={small} disabled={busy} onClick={() => change(items.filter((other) => other.id !== item.id))} aria-label={`Remove ${item.file.name}`}>
                  Remove
                </button>
              </li>
            ))}
          </ol>

          <div className="flex flex-wrap items-center gap-3">
            <button type="button" onClick={() => void createZip()} disabled={busy} className="rounded-md bg-primary px-4 py-2 font-medium text-white disabled:opacity-50">
              {busy ? "Creating…" : "Create ZIP"}
            </button>
            <button type="button" onClick={() => change([])} disabled={busy} className="rounded-md border border-line px-4 py-2 font-medium text-heading disabled:opacity-50">
              Clear all
            </button>
          </div>
        </>
      )}

      <div aria-live="polite">
        {result && !result.ok && <p role="alert" className="text-danger">{result.error}</p>}
        {result?.ok && (
          <div className="space-y-3">
            <p className="text-success">
              Done. Your ZIP file is {formatBytes(result.blob.size)} (the PDFs alone are {formatBytes(total)}).
            </p>
            <ul className="divide-y divide-line rounded-lg border border-line text-sm">
              {result.entries.map((entry) => (
                <li key={entry.name} className="flex justify-between gap-3 p-3">
                  <span className="min-w-0 break-words text-heading">{entry.name}</span>
                  <span className="shrink-0 text-body">
                    {formatBytes(entry.size)} → {formatBytes(entry.packed)}
                  </span>
                </li>
              ))}
            </ul>
            <p className="text-sm text-body">PDF files are often already compressed, so the ZIP file may be only a little smaller, or the same size.</p>
            <button type="button" onClick={() => downloadBlob(result.blob, result.zipName)} className="rounded-md bg-primary px-4 py-2 font-medium text-white">
              Download {result.zipName}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}