import { isDark, type QrCode } from "./qrEncoder";
import { isHexColor } from "./qrColor";

export const MARGIN_RANGE = { min: 0, max: 10, standard: 4 } as const;
export const MAX_PNG_SIDE = 4096;

export interface SvgOptions {
  margin: number;
  foreground: string;
  background: string | null; // null = transparent
}

// SVG text. Har qatar ke gehre modules ek hi path mein jorte hain, taake file chhoti rahe.
export function qrToSvg(qr: QrCode, options: SvgOptions): string {
  const { margin, foreground, background } = options;
  if (!Number.isInteger(margin) || margin < MARGIN_RANGE.min || margin > MARGIN_RANGE.max) throw new RangeError("Invalid margin.");
  if (!isHexColor(foreground) || (background !== null && !isHexColor(background))) throw new RangeError("Colours must look like #1a2b3c.");

  const total = qr.size + margin * 2;
  let path = "";
  for (let y = 0; y < qr.size; y += 1) {
    let x = 0;
    while (x < qr.size) {
      if (!isDark(qr, x, y)) {
        x += 1;
        continue;
      }
      let end = x;
      while (end < qr.size && isDark(qr, end, y)) end += 1;
      path += `M${x + margin} ${y + margin}h${end - x}v1h-${end - x}z`;
      x = end;
    }
  }

  const back = background === null ? "" : `<rect width="${total}" height="${total}" fill="${background}"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${total} ${total}" width="${total * 10}" height="${total * 10}" shape-rendering="crispEdges">${back}<path d="${path}" fill="${foreground}"/></svg>`;
}

// PNG mein har module poore pixels ka hona chahiye, warna kinare dhundhle ho kar scan kharab karte hain.
// Is liye chaurai target ke qareeb wo sab se barha poora guna (multiple) hai.
export function qrPixelSize(moduleCount: number, margin: number, targetPixels: number): { scale: number; pixels: number } {
  const total = moduleCount + margin * 2;
  const limit = Math.min(Math.max(1, targetPixels), MAX_PNG_SIDE);
  const scale = Math.max(1, Math.floor(limit / total));
  return { scale, pixels: scale * total };
}