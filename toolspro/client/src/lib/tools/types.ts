
export type TransformResult =
  | { ok: true; output: string; message: string }
  | { ok: false; error: string };