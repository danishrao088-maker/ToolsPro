import type { ReactNode } from "react";
import type { ImageBatch } from "../../hooks/useImageBatch";
import { plural } from "../../lib/format";
import { Button } from "../common/Button";
import { InlineError } from "../common/InlineError";
import { ImageDropZone } from "./ImageDropZone";
import { ImageFileList } from "./ImageFileList";
import { ImageResultList } from "./ImageResultList";

interface ImageBatchWorkspaceProps {
  batch: ImageBatch;
  idPrefix: string;
  actionLabel: string;
  children: ReactNode; // tool ki apni settings
}

export function ImageBatchWorkspace({ batch, idPrefix, actionLabel, children }: ImageBatchWorkspaceProps) {
  const { files, rejected, items, progress, busy } = batch;

  let status = "";
  if (progress) {
    status = `Working: ${progress.done} of ${progress.total} done.`;
  } else if (items) {
    const ready = items.filter((item) => item.ok).length;
    const failed = items.length - ready;
    status = `${plural(ready, "image")} ready.${failed > 0 ? ` ${plural(failed, "image")} could not be processed.` : ""}`;
  }

  return (
    <div className="space-y-6">
      <ImageDropZone id={`${idPrefix}-files`} onFiles={batch.addFiles} disabled={busy} />

      {rejected.length > 0 ? (
        <div className="space-y-2">
          {rejected.map((message) => (
            <InlineError key={message} message={message} />
          ))}
        </div>
      ) : null}

      {files.length > 0 ? <ImageFileList files={files} onRemove={batch.removeFile} disabled={busy} /> : null}

      <div className="space-y-4">{children}</div>

      <div className="flex flex-wrap gap-3">
        <Button onClick={() => void batch.run()} disabled={files.length === 0 || busy}>
          {busy ? "Working..." : actionLabel}
        </Button>
        <Button variant="ghost" onClick={batch.clearAll} disabled={files.length === 0 && items === null}>
          Clear all
        </Button>
      </div>

      <p role="status" className="min-h-6">
        {status}
      </p>

      {items ? <ImageResultList items={items} /> : null}
    </div>
  );
}