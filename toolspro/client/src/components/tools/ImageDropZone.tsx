import { useState, type DragEvent } from "react";
import { ImagePlus } from "lucide-react";
import { MAX_FILES, MAX_FILE_BYTES, formatBytes } from "../../lib/image/imageCore";

interface ImageDropZoneProps {
  id: string;
  onFiles: (files: File[]) => void;
  disabled?: boolean;
}

const ACCEPT = "image/jpeg,image/png,image/webp,image/gif,image/bmp,image/avif,.jpg,.jpeg,.png,.webp,.gif,.bmp,.avif";

export function ImageDropZone({ id, onFiles, disabled = false }: ImageDropZoneProps) {
  const [dragging, setDragging] = useState(false);

  const handleDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault(); // warna browser tasveer ko naye tab mein khol deta hai
    setDragging(false);
    if (!disabled) onFiles(Array.from(event.dataTransfer.files));
  };

  return (
    <label
      htmlFor={id}
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-8 text-center focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-primary ${
        dragging ? "border-primary bg-surface-muted" : "border-line bg-surface"
      } ${disabled ? "cursor-not-allowed opacity-60" : ""}`}
    >
      <ImagePlus aria-hidden="true" size={32} />
      <span className="font-medium text-heading">Choose images or drop them here</span>
      <span className="text-sm">
        JPG, PNG, WebP, GIF, BMP or AVIF. Up to {MAX_FILES} images, {formatBytes(MAX_FILE_BYTES)} each.
      </span>
      <input
        id={id}
        type="file"
        multiple
        accept={ACCEPT}
        disabled={disabled}
        className="sr-only"
        onChange={(e) => {
          onFiles(Array.from(e.currentTarget.files ?? []));
          e.currentTarget.value = ""; // dobara wohi file chunne par bhi change event aaye
        }}
      />
    </label>
  );
}