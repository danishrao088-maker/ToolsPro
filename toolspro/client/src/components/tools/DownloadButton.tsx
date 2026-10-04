import { Download } from "lucide-react";
import { downloadTextFile } from "../../lib/download";
import { Button } from "../common/Button";

interface DownloadButtonProps {
  filename: string;
  content: string;
  mimeType?: string;
  disabled?: boolean;
}

export function DownloadButton({ filename, content, mimeType, disabled = false }: DownloadButtonProps) {
  return (
    <Button variant="outline" onClick={() => downloadTextFile(filename, content, mimeType)} disabled={disabled}>
      <Download aria-hidden="true" size={18} />
      Download
    </Button>
  );
}