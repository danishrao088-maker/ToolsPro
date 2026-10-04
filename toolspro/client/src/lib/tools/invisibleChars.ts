export interface InvisibleChar {
  id: string;
  name: string;
  codePoint: number;
  note: string;
}

export const INVISIBLE_CHARS: InvisibleChar[] = [
  {
    id: "braille-blank",
    name: "Braille pattern blank",
    codePoint: 0x2800,
    note: "Looks empty but takes up normal width. Many forms accept it where a plain space is rejected.",
  },
  {
    id: "hangul-filler",
    name: "Hangul filler",
    codePoint: 0x3164,
    note: "Looks empty and is wider than a normal space. Some apps treat it as a letter, not as a blank.",
  },
  {
    id: "zero-width-space",
    name: "Zero width space",
    codePoint: 0x200b,
    note: "Takes no width. Useful to allow a line break inside a long word or address.",
  },
  {
    id: "zero-width-non-joiner",
    name: "Zero width non-joiner",
    codePoint: 0x200c,
    note: "Takes no width. Stops two neighbouring letters from joining, which matters in Urdu, Arabic and Persian.",
  },
  {
    id: "zero-width-joiner",
    name: "Zero width joiner",
    codePoint: 0x200d,
    note: "Takes no width. Joins neighbouring characters, for example in some emoji and scripts.",
  },
  {
    id: "word-joiner",
    name: "Word joiner",
    codePoint: 0x2060,
    note: "Takes no width. Stops a line from breaking at that point.",
  },
  {
    id: "no-break-space",
    name: "No-break space",
    codePoint: 0x00a0,
    note: "Looks like a space but does not allow a line break there.",
  },
  {
    id: "em-space",
    name: "Em space",
    codePoint: 0x2003,
    note: "A wide space, about the width of the letter M.",
  },
];

export const MAX_REPEAT = 100;

export function formatCodePoint(codePoint: number): string {
  return `U+${codePoint.toString(16).toUpperCase().padStart(4, "0")}`;
}

// "5" -> 5, lekin "abc", "", "1.5" -> NaN
export function parseRepeatCount(value: string): number {
  const trimmed = value.trim();
  return /^\d+$/.test(trimmed) ? Number(trimmed) : Number.NaN;
}

export type RepeatResult = { ok: true; text: string } | { ok: false; error: string };

export function repeatChar(codePoint: number, count: number): RepeatResult {
  if (!INVISIBLE_CHARS.some((item) => item.codePoint === codePoint)) {
    return { ok: false, error: "Choose a character from the list." };
  }
  if (!Number.isInteger(count) || count < 1 || count > MAX_REPEAT) {
    return { ok: false, error: `Enter a whole number from 1 to ${MAX_REPEAT}.` };
  }
  return { ok: true, text: String.fromCodePoint(codePoint).repeat(count) };
}