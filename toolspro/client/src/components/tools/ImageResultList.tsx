import { Download } from "lucide-react";
import type { BatchItem } from "../../hooks/useImageBatch";
import { downloadBlob } from "../../lib/image/downloadBlob";
import { describeChange, formatBytes } from "../../lib/image/imageCore";
import { Button } from "../common/Button";
import { InlineError } from "../common/InlineError";

export function ImageResultList({ items }: { items: BatchItem[] }) {
  return (
    <ul className="space-y-3">
      {items.map((item) => {
        if (!item.ok) {
          return (
            <li key={item.id} className="rounded-lg border border-line bg-surface p-4">
              <InlineError message={`${item.inputName}: ${item.error}`} />
            </li>
          );
        }
        const resized = item.width !== item.sourceWidth || item.height !== item.sourceHeight;
        return (
          <li
            key={item.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line bg-surface p-4"
          >
            <div className="min-w-0 flex-1">
              <p className="break-words font-medium text-heading">{item.outputName}</p>
              <p className="text-sm">
                {formatBytes(item.inputSize)} to {formatBytes(item.blob.size)} ({describeChange(item.inputSize, item.blob.size)})
              </p>
              <p className="text-sm">
                {resized
                  ? `${item.sourceWidth} × ${item.sourceHeight} to ${item.width} × ${item.height} pixels`
                  : `${item.width} × ${item.height} pixels`}
              </p>
              {item.note ? <p className="text-sm">{item.note}</p> : null}
            </div>
            <Button variant="ghost" onClick={() => downloadBlob(item.blob, item.outputName)}>
              <Download aria-hidden="true" size={18} />
              Download
              <span className="sr-only"> {item.outputName}</span>
            </Button>
          </li>
        );
      })}
    </ul>
  );
}