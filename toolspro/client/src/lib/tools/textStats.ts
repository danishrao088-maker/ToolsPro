export const MAX_EDITOR_CHARS = 1_000_000;
export const MAX_FILE_BYTES = 1_000_000;

export interface TextStats {
  characters: number;
  charactersNoSpaces: number;
  words: number;
  lines: number;
  paragraphs: number;
}

export function countText(text: string): TextStats {
  if (text === "") return { characters: 0, charactersNoSpaces: 0, words: 0, lines: 0, paragraphs: 0 };

  const trimmed = text.trim();
  return {
    // Array.from emoji ko ek character ginta hai (text.length do ginta)
    characters: Array.from(text).length,
    charactersNoSpaces: Array.from(text.replace(/\s/g, "")).length,
    words: trimmed === "" ? 0 : trimmed.split(/\s+/).length,
    lines: text.split(/\r\n|\r|\n/).length,
    // Paragraph = khali line se alag hui poori text
    paragraphs: text.split(/(?:\r\n|\r|\n)\s*(?:\r\n|\r|\n)/).filter((part) => part.trim() !== "").length,
  };
}

export type FileCheck = { ok: true } | { ok: false; error: string };

export function checkOpenedFile(size: number, text: string): FileCheck {
  if (size > MAX_FILE_BYTES) {
    return { ok: false, error: `That file is too large. The maximum is ${MAX_FILE_BYTES.toLocaleString("en-US")} bytes.` };
  }
  // Binary files (image, zip...) mein NUL character hota hai, text mein nahi
  if (text.includes("\u0000")) {
    return { ok: false, error: "That file does not look like plain text." };
  }
  if (text.length > MAX_EDITOR_CHARS) {
    return { ok: false, error: `That file has too much text. The maximum is ${MAX_EDITOR_CHARS.toLocaleString("en-US")} characters.` };
  }
  return { ok: true };
}