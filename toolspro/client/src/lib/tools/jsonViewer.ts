import { plural } from "../format";
import type { TransformResult } from "./types";

export const MAX_JSON_LENGTH = 1_000_000;

type ParseResult = { ok: true; value: unknown } | { ok: false; error: string };

function parseJson(input: string): ParseResult {
  if (input.trim() === "") return { ok: false, error: "Enter some JSON to process." };
  if (input.length > MAX_JSON_LENGTH) {
    return {
      ok: false,
      error: `This JSON is too large. The maximum is ${MAX_JSON_LENGTH.toLocaleString("en-US")} characters.`,
    };
  }
  try {
    return { ok: true, value: JSON.parse(input) as unknown };
  } catch (err) {
    const detail = err instanceof SyntaxError ? err.message : "The text could not be read.";
    return { ok: false, error: `Invalid JSON: ${detail}` };
  }
}

export function formatJson(input: string, indent: 2 | 4 = 2): TransformResult {
  const parsed = parseJson(input);
  if (!parsed.ok) return parsed;
  return {
    ok: true,
    output: JSON.stringify(parsed.value, null, indent),
    message: `Valid JSON. Formatted with ${indent} spaces.`,
  };
}

export function minifyJson(input: string): TransformResult {
  const parsed = parseJson(input);
  if (!parsed.ok) return parsed;
  const output = JSON.stringify(parsed.value);
  return {
    ok: true,
    output,
    message: `Valid JSON. Minified from ${plural(input.length, "character")} to ${plural(output.length, "character")}.`,
  };
}