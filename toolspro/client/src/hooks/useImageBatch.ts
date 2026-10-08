import { useEffect, useRef, useState } from "react";
import { processImage, type ProcessOptions } from "../lib/image/canvasImage";
import { MAX_FILES, getOutputFormat, outputFileName, validateImageFile } from "../lib/image/imageCore";

// Har file ke liye tool batata hai ke kaise process karna hai (format, quality...) aur koi note
export interface FilePlan extends ProcessOptions {
  note: string;
}

export type BatchItem =
  | {
      ok: true;
      id: number;
      inputName: string;
      inputSize: number;
      outputName: string;
      blob: Blob;
      sourceWidth: number;
      sourceHeight: number;
      width: number;
      height: number;
      note: string;
    }
  | { ok: false; id: number; inputName: string; error: string };

export interface ImageBatch {
  files: File[];
  rejected: string[];
  items: BatchItem[] | null;
  progress: { done: number; total: number } | null;
  busy: boolean;
  addFiles: (incoming: File[]) => void;
  removeFile: (index: number) => void;
  clearAll: () => void;
  run: () => Promise<void>;
}

export function useImageBatch<S>(settings: S, plan: (file: File, settings: S) => FilePlan): ImageBatch {
  const [files, setFiles] = useState<File[]>([]);
  const [rejected, setRejected] = useState<string[]>([]);
  const [results, setResults] = useState<{ files: File[]; settings: S; items: BatchItem[] } | null>(null);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);

  // Har run ka number. Naya run, "Clear all" ya page chhorna purane run ko batata hai ke ruk jao.
  const runId = useRef(0);
  useEffect(() => {
    return () => {
      runId.current += 1;
    };
  }, []);

  const busy = progress !== null;

  const addFiles = (incoming: File[]) => {
    if (busy) return;
    const messages: string[] = [];
    const next = [...files];

    for (const file of incoming) {
      const check = validateImageFile(file);
      if (!check.ok) {
        messages.push(check.error);
        continue;
      }
      if (next.length >= MAX_FILES) {
        messages.push(`Only ${MAX_FILES} images can be added at a time. "${file.name}" was not added.`);
        continue;
      }
      const duplicate = next.some(
        (existing) =>
          existing.name === file.name && existing.size === file.size && existing.lastModified === file.lastModified
      );
      if (duplicate) {
        messages.push(`"${file.name}" is already in the list.`);
        continue;
      }
      next.push(file);
    }
    setFiles(next);
    setRejected(messages);
  };

  const removeFile = (index: number) => {
    if (busy) return;
    setFiles(files.filter((_, position) => position !== index));
    setRejected([]);
  };

  const clearAll = () => {
    runId.current += 1;
    setFiles([]);
    setRejected([]);
    setResults(null);
    setProgress(null);
  };

  const run = async () => {
    if (busy || files.length === 0) return;
    runId.current += 1;
    const myRun = runId.current;

    // Run shuru hone ke waqt ki files aur settings yaad rakhte hain
    const sourceFiles = files;
    const sourceSettings = settings;
    const usedNames = new Set<string>();
    const items: BatchItem[] = [];
    setProgress({ done: 0, total: sourceFiles.length });

    for (const [index, file] of sourceFiles.entries()) {
      const options = plan(file, sourceSettings);
      const result = await processImage(file, options);
      if (runId.current !== myRun) return; // beech mein Clear all ya page band hua

      if (result.ok) {
        const extension = getOutputFormat(options.mime)?.extension ?? "img";
        items.push({
          ok: true,
          id: index,
          inputName: file.name,
          inputSize: file.size,
          outputName: outputFileName(file.name, extension, usedNames),
          blob: result.blob,
          sourceWidth: result.sourceWidth,
          sourceHeight: result.sourceHeight,
          width: result.width,
          height: result.height,
          note: options.note,
        });
      } else {
        items.push({ ok: false, id: index, inputName: file.name, error: result.error });
      }
      setProgress({ done: index + 1, total: sourceFiles.length });
    }

    setResults({ files: sourceFiles, settings: sourceSettings, items });
    setProgress(null);
  };

  // Nateeja sirf tab dikhta hai jab files aur settings wohi hon jin se bana tha
  const items = results && results.files === files && results.settings === settings ? results.items : null;

  return { files, rejected, items, progress, busy, addFiles, removeFile, clearAll, run };
}