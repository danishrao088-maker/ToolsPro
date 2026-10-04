import type { TransformResult } from "./types";

export function output(result: TransformResult): string {
  if (!result.ok) throw new Error(`Expected success but got: ${result.error}`);
  return result.output;
}

export function error(result: TransformResult): string {
  if (result.ok) throw new Error("Expected an error but the conversion succeeded.");
  return result.error;
}