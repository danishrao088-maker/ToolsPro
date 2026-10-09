import { buildZip, type ZipFile } from "../image/zip";

// ZIP bana kar download ke liye Blob deta hai
export function zipFilesAsBlob(files: ZipFile[]): Blob {
  return new Blob([buildZip(files)], { type: "application/zip" });
}