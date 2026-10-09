import { useRef, useState } from "react";
import FileDrop from "../../components/tools/FileDrop";
import { useAsyncResult } from "../../hooks/useAsyncResult";
import { downloadBlob } from "../../lib/image/downloadBlob";
import { formatBytes } from "../../lib/image/imageCore";
import { MAX_PDF_FILES, MAX_TOTAL_BYTES, moveItem, totalSize, validatePdfFile } from "../../lib/pdf/pdfCore";
import { mergePdfs, type SavedPdf } from "../../lib/pdf/pdfOps";

interface Item {
  id: number;
  file: File;
}

const small = "rounded-md border border-line px-2 py-1 text-sm text-heading disabled:opacity-40";

export default function MergePdfTool() {
  const [items, setItems] = useState<Item[]>([]);
  const [problems, setProblems] = useState<string[]>([]);
  const nextId = useRef(1);
  const job = useAsyncResult<Item[], SavedPdf>();

  const result = job.resultFor(items);
  const total = totalSize(items.map((item) => item.file));

  function addFiles(files: File[]) {
    job.cancel();
    const notes: string[] = [];
    const accepted: Item[] = [];
    let count = items.length;
    let bytes = total;
    for (const file of files) {
      const check = validatePdfFile(file);
      if (!check.ok) notes.push(check.error);
      else if (count >= MAX_PDF_FILES) notes.push(`"${file.name}" was not added. You can merge up to ${MAX_PDF_FILES} files at a time.`);
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
    job.cancel();
    setProblems([]);
    setItems(next);
  }

  async function merge() {
    await job.run(items, () => mergePdfs(items.map((item) => item.file)));
  }

  function download() {
    if (result?.ok) downloadBlob(new Blob([result.bytes], { type: "application/pdf" }), "merged.pdf");
  }

  return (
    <div className="space-y-5">
      <FileDrop
        accept=".pdf,application/pdf"
        multiple
        title="Choose PDF files, or drop them here"
        hint={`Add at least 2 files, up to ${MAX_PDF_FILES}. The files stay in this order in the merged PDF.`}
        onFiles={addFiles}
        disabled={job.busy}
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
                <span className="w-6 text-sm text-body">{index + 1}.</span>
                <span className="min-w-0 flex-1 break-words text-sm text-heading">
                  {item.file.name} <span className="text-body">({formatBytes(item.file.size)})</span>
                </span>
                <button type="button" className={small} disabled={job.busy || index === 0} onClick={() => change(moveItem(items, index, index - 1))} aria-label={`Move ${item.file.name} up`}>
                  Up
                </button>
                <button type="button" className={small} disabled={job.busy || index === items.length - 1} onClick={() => change(moveItem(items, index, index + 1))} aria-label={`Move ${item.file.name} down`}>
                  Down
                </button>
                <button type="button" className={small} disabled={job.busy} onClick={() => change(items.filter((other) => other.id !== item.id))} aria-label={`Remove ${item.file.name}`}>
                  Remove
                </button>
              </li>
            ))}
          </ol>

          <div className="flex flex-wrap items-center gap-3">
            <button type="button" onClick={() => void merge()} disabled={job.busy || items.length < 2} className="rounded-md bg-primary px-4 py-2 font-medium text-white disabled:opacity-50">
              {job.busy ? "Merging…" : "Merge PDFs"}
            </button>
            <button type="button" onClick={() => change([])} disabled={job.busy} className="rounded-md border border-line px-4 py-2 font-medium text-heading disabled:opacity-50">
              Clear all
            </button>
            {items.length < 2 && <span className="text-sm text-body">Add one more PDF to merge.</span>}
          </div>
        </>
      )}

      <div aria-live="polite">
        {result && !result.ok && <p role="alert" className="text-danger">{result.error}</p>}
        {result?.ok && (
          <div className="space-y-3">
            <p className="text-success">Done. The merged PDF has {result.pages} {result.pages === 1 ? "page" : "pages"} ({formatBytes(result.bytes.length)}).</p>
            <button type="button" onClick={download} className="rounded-md bg-primary px-4 py-2 font-medium text-white">
              Download merged.pdf
            </button>
          </div>
        )}
      </div>
    </div>
  );
}