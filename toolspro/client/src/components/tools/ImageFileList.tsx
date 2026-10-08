import { X } from "lucide-react";
import { formatBytes } from "../../lib/image/imageCore";
import { Button } from "../common/Button";

interface ImageFileListProps {
  files: File[];
  onRemove: (index: number) => void;
  disabled?: boolean;
}

export function ImageFileList({ files, onRemove, disabled = false }: ImageFileListProps) {
  return (
    <ul className="divide-y divide-line rounded-lg border border-line bg-surface">
      {files.map((file, index) => (
        <li key={`${file.name}-${file.size}-${file.lastModified}`} className="flex items-center justify-between gap-3 p-3">
          <span className="min-w-0 break-words text-sm text-heading">
            {file.name} <span className="text-body">({formatBytes(file.size)})</span>
          </span>
          <Button variant="ghost" onClick={() => onRemove(index)} disabled={disabled}>
            <X aria-hidden="true" size={16} />
            <span className="sr-only">Remove {file.name}</span>
          </Button>
        </li>
      ))}
    </ul>
  );
}