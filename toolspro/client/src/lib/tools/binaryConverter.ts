import { plural } from "../format";
import type { TransformResult } from "./types";

export const MAX_TEXT_LENGTH = 100_000; // binary 9 guna bara hota hai, is liye hadd chhoti
export const MAX_BINARY_LENGTH = 900_000;

export function textToBinary(input: string): TransformResult {
  if (input === "") return { ok: false, error: "Enter some text to convert." };
  if (input.length > MAX_TEXT_LENGTH) {
    return {
      ok: false,
      error: `This text is too long. The maximum is ${MAX_TEXT_LENGTH.toLocaleString("en-US")} characters.`,
    };
  }

  const bytes = new TextEncoder().encode(input);
  const output = Array.from(bytes, (b) => b.toString(2).padStart(8, "0")).join(" ");
  const characters = [...input].length;
  return {
    ok: true,
    output,
    message: `Converted ${plural(characters, "character")} into ${plural(bytes.length, "byte")}.`,
  };
}

export function binaryToText(input: string): TransformResult {
  if (input.trim() === "") return { ok: false, error: "Enter some binary to convert." };
  if (input.length > MAX_BINARY_LENGTH) {
    return {
      ok: false,
      error: `This input is too long. The maximum is ${MAX_BINARY_LENGTH.toLocaleString("en-US")} characters.`,
    };
  }

  const compact = input.replace(/\s+/g, "");
  if (!/^[01]+$/.test(compact)) {
    return { ok: false, error: "Binary can contain only 0 and 1. Spaces and line breaks are allowed." };
  }
  if (compact.length % 8 !== 0) {
    return {
      ok: false,
      error: `Binary must come in groups of 8 bits (1 byte). You entered ${plural(compact.length, "bit")}, which is not a multiple of 8.`,
    };
  }

  const bytes = new Uint8Array(compact.length / 8);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(compact.slice(i * 8, i * 8 + 8), 2);
  }

  try {
    const output = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    return { ok: true, output, message: `Converted ${plural(bytes.length, "byte")} into text.` };
  } catch {
    return { ok: false, error: "These bytes are not valid UTF-8 text, so they cannot be shown as text." };
  }
}