export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  // URL memory mein tab tak rehta hai jab tak revoke na karein; download shuru hone ke baad hata dete hain
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}