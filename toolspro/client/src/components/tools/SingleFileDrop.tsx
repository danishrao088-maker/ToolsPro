import { useId, useState, type DragEvent } from "react";

interface SingleFileDropProps {
  accept: string;
  title: string;
  hint: string;
  onFile: (file: File) => void;
  disabled?: boolean;
}

// Ek file ke liye drop box (SVG aur favicon tools mein istemal hota hai)
export default function SingleFileDrop({ accept, title, hint, onFile, disabled = false }: SingleFileDropProps) {
  const inputId = useId();
  const [over, setOver] = useState(false);

  function handleDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setOver(false);
    if (disabled) return;
    const file = event.dataTransfer.files[0];
    if (file) onFile(file);
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
        disabled={disabled}
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) onFile(file);
          event.target.value = ""; // wahi file dobara chunna mumkin rahe
        }}
      />
    </label>
  );
}