// SVG ko <img> mein dikhane ke liye. Text URL mein encode hota hai, DOM mein kabhi nahi daala jata.
export function svgToDataUrl(text: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(text)}`;
}

// Chhote PNG ko <img> mein dikhane ke liye. 0x8000 ke tukron mein kaam hota hai, warna bari array par
// String.fromCharCode(...bytes) "too many arguments" ka error deta hai.
export function bytesToDataUrl(bytes: Uint8Array, mime: string): string {
  const CHUNK = 0x8000;
  let binary = "";
  for (let start = 0; start < bytes.length; start += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(start, start + CHUNK));
  }
  return `data:${mime};base64,${btoa(binary)}`;
}