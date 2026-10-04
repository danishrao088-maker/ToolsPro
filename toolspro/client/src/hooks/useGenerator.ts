import { useState } from "react";
import type { TransformResult } from "../lib/tools/types";

// Form ki values, "Generate" ka nateeja, aur Reset. `initial` module level ka mustaqil object hona chahiye.
export function useGenerator<T extends object>(initial: T, generate: (values: T) => TransformResult) {
  const [values, setValues] = useState<T>(initial);
  const [generated, setGenerated] = useState<{ source: T; result: TransformResult } | null>(null);

  const setField =
    <K extends keyof T>(key: K) =>
    (value: T[K]) => {
      setValues((prev) => ({ ...prev, [key]: value }));
    };

  const run = () => setGenerated({ source: values, result: generate(values) });

  const reset = () => {
    setValues(initial);
    setGenerated(null);
  };

  // Nateeja sirf tab dikhta hai jab form wohi ho jis se bana tha. Koi field badla to purana nateeja khud hat jata hai.
  const result = generated && generated.source === values ? generated.result : null;

  return { values, setField, run, reset, result };
}