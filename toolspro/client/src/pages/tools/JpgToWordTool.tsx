import { useRef, useState } from "react";
import FileDrop from "../../components/tools/FileDrop";
import { downloadBlob } from "../../lib/image/downloadBlob";
import { MAX_FILES, formatBytes, validateImageFile } from "../../lib/image/imageCore";
import { moveItem, totalSize } from "../../lib/pdf/pdfCore";
import { MARGINS, PAGE_SIZES, SIZE_MODES, buildDocx, type DocxImage, type Margin, type PageSize, type SizeMode } from "../../lib/word/docx";
import { prepareImage } from "../../lib/word/wordImages";

interface Item {
  id: number;
  file: File;
}

type Made = { ok: true; blob: Blob; count: number } | { ok: false; error: string };

const MAX_TOTAL = 100 * 1024 * 1024;
const field = "w-full rounded-md border border-line bg-surface px-3 py-2 text-body";
const small = "rounded-md border border-line px-2 py-1 text-sm text-heading disabled:opacity-40";
const WORD_TYPE = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

export default function JpgToWordTool() {
  const [items, setItems] = useState<Item[]>([]);
  const [problems, setProblems] = useState<string[]>([]);
  const [pageSize, setPageSize] = useState<PageSize>("a4");
  const [margin, setMargin] = useState<Margin>("small");
  const [sizeMode, setSizeMode] = useState<SizeMode>("fit");
  const [busy, setBusy] = useState(false);
  const [made, setMade] = useState<{ key: string; result: Made } | null>(null);
  const nextId = useRef(1);

  const total = totalSize(items.map((item) => item.file));
  // Natija sirf tab dikhta hai jab files aur settings wahi hon jin se bana tha
  const key = `${items.map((item) => item.id).join(",")}|${pageSize}|${margin}|${sizeMode}`;
  const result = made && made.key === key ? made.result : null;

  function addFiles(files: File[]) {
    const notes: string[] = [];
    const accepted: Item[] = [];
    let count = items.length;
    let bytes = total;
    for (const file of files) {
      const check = validateImageFile(file);
      if (!check.ok) notes.push(check.error);
      else if (count >= MAX_FILES) notes.push(`"${file.name}" was not added. You can add up to ${MAX_FILES} pictures at a time.`);
      else if (bytes + file.size > MAX_TOTAL) notes.push(`"${file.name}" was not added. The pictures together can be at most ${formatBytes(MAX_TOTAL)}.`);
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

  async function createWord() {
    const snapshot = items;
    const runKey = key;
    setBusy(true);
    let outcome: Made;
    try {
      const images: DocxImage[] = [];
      for (const [index, item] of snapshot.entries()) {
        const prepared = await prepareImage(item.file, item.file.name);
        if (!prepared.ok) {
          setMade({ key: runKey, result: { ok: false, error: prepared.error } });
          return;
        }
        images.push({ ...prepared.image, name: `${index + 1} - ${item.file.name}` });
      }
      const bytes = await buildDocx(images, { pageSize, margin, sizeMode });
      outcome = { ok: true, blob: new Blob([bytes], { type: WORD_TYPE }), count: images.length };
    } catch {
      outcome = { ok: false, error: "The Word file could not be created. A picture may be damaged, or your browser may be out of memory." };
    } finally {
      setBusy(false);
    }
    setMade({ key: runKey, result: outcome });
  }

  return (
    <div className="space-y-5">
      <FileDrop
        accept="image/jpeg,image/png,image/webp,image/gif,image/bmp,image/avif,.jpg,.jpeg,.png,.webp,.gif,.bmp,.avif"
        multiple
        title="Choose pictures, or drop them here"
        hint={`JPG, PNG, WebP, GIF, BMP or AVIF. Up to ${MAX_FILES} pictures. Each picture gets its own page.`}
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
                <span className="w-6 text-sm text-body">{index + 1}.</span>
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

          <div className="grid gap-4 sm:grid-cols-3">
            <label className="block text-sm font-medium text-heading">
              Page size
              <select className={`${field} mt-1`} value={pageSize} onChange={(e) => setPageSize(e.target.value as PageSize)}>
                {PAGE_SIZES.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm font-medium text-heading">
              Margin
              <select className={`${field} mt-1`} value={margin} onChange={(e) => setMargin(e.target.value as Margin)}>
                {MARGINS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm font-medium text-heading">
              Picture size
              <select className={`${field} mt-1`} value={pageSize === "match" ? "fit" : sizeMode} disabled={pageSize === "match"} onChange={(e) => setSizeMode(e.target.value as SizeMode)}>
                {SIZE_MODES.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <p className="text-sm text-body">With A4 or US Letter, the page turns sideways for a wide picture.</p>

          <div className="flex flex-wrap items-center gap-3">
            <button type="button" onClick={() => void createWord()} disabled={busy} className="rounded-md bg-primary px-4 py-2 font-medium text-white disabled:opacity-50">
              {busy ? "Creating…" : "Create Word file"}
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
              Done. Your Word file has {result.count} {result.count === 1 ? "page" : "pages"} ({formatBytes(result.blob.size)}).
            </p>
            <p className="text-sm text-body">The pictures are placed as pictures. Text inside them is not converted into editable text.</p>
            <button type="button" onClick={() => downloadBlob(result.blob, "pictures.docx")} className="rounded-md bg-primary px-4 py-2 font-medium text-white">
              Download pictures.docx
            </button>
          </div>
        )}
      </div>
    </div>
  );
}