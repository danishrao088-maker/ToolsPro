export const HEX_COLOR = /^#[0-9a-f]{6}$/i;

export function isHexColor(value: string): boolean {
  return HEX_COLOR.test(value);
}

function channel(value: number): number {
  const v = value / 255;
  return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
}

export function luminance(hex: string): number {
  const n = Number.parseInt(hex.slice(1), 16);
  return 0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255);
}

// WCAG ka contrast ratio: 1 (bilkul ek jaise) se 21 (kala/safed)
export function contrastRatio(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

// Scan hone ke liye: gehra rang halke rang par, aur kaafi farq
export function colorWarning(foreground: string, background: string): string {
  if (!isHexColor(foreground) || !isHexColor(background)) return "";
  if (luminance(foreground) > luminance(background)) {
    return "The code is lighter than its background. Many scanners cannot read this. Use a dark code on a light background.";
  }
  if (contrastRatio(foreground, background) < 4) {
    return "The colours are too close to each other. The code may not scan. Make the code darker or the background lighter.";
  }
  return "";
}