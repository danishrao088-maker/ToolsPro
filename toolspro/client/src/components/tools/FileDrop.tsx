import { useId, useState, type DragEvent } from "react";

interface FileDropProps {
  accept: string;
  title: string;
  hint: string;
  multiple?: boolean;
  disabled?: boolean;
  onFiles: (files: File[]) => void;
}

// Ek ya kai files ke liye drop box
export default function FileDrop({ accept, title, hint, multiple = false, disabled = false, onFiles }: FileDropProps) {
  const inputId = useId();
  const [over, setOver] = useState(false);

  function handleDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setOver(false);
    if (disabled) return;
    const files = Array.from(event.dataTransfer.files);
    if (files.length > 0) onFiles(multiple ? files : files.slice(0, 1));
  }

  return (
    <label
      htmlFor={inputId}
      onDragOver={(event) => {
        event.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={handleDrop}
      className={`flex cursor-pointer flex-col items-center gap-1 rounded-lg border-2 border-dashed px-4 py-8 text-center focus-within:outline-2 focus-within:outline-primary ${
        over ? "border-primary bg-surface-muted" : "border-line"
      }`}
    >
      <span className="font-medium text-heading">{title}</span>
      <span className="text-sm text-body">{hint}</span>
      <input
        id={inputId}
        type="file"
        accept={accept}
        multiple={multiple}
        disabled={disabled}
        className="sr-only"
        onChange={(event) => {
          const files = Array.from(event.target.files ?? []);
          if (files.length > 0) onFiles(files);
          event.target.value = ""; // wahi file dobara chunna mumkin rahe
        }}
      />
    </label>
  );
}