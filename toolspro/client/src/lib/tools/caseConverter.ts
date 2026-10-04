export const MAX_INPUT_LENGTH = 500_000;

export type ConvertResult =
  | { ok: true; output: string; characters: number; words: number }
  | { ok: false; error: string };

export function convertToLowercase(input: string): ConvertResult {
  if (input.trim() === "") {
    return { ok: false, error: "Enter some text to convert." };
  }
  if (input.length > MAX_INPUT_LENGTH) {
    return {
      ok: false,
      error: `This text is too long. The maximum is ${MAX_INPUT_LENGTH.toLocaleString("en-US")} characters.`,
    };
  }

  const output = input.toLowerCase();
  const words = output.trim().split(/\s+/).length;
  return { ok: true, output, characters: output.length, words };
}