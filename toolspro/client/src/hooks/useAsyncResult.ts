import { useCallback, useRef, useState } from "react";

interface Stored<I, R> {
  input: I;
  value: R;
}

// Ek async kaam chalata hai. Naya kaam shuru ho ya cancel() ho to purana jawab ignore ho jata hai.
// Natija sirf tab dikhta hai jab wo isi `input` (identity) ke liye bana ho.
export function useAsyncResult<I extends object, R>() {
  const [stored, setStored] = useState<Stored<I, R> | null>(null);
  const [busy, setBusy] = useState(false);
  const runId = useRef(0);

  const run = useCallback(async (input: I, task: () => Promise<R>) => {
    runId.current += 1;
    const id = runId.current;
    setBusy(true);
    try {
      const value = await task();
      if (id === runId.current) setStored({ input, value });
    } finally {
      if (id === runId.current) setBusy(false);
    }
  }, []);

  const cancel = useCallback(() => {
    runId.current += 1;
    setBusy(false);
    setStored(null);
  }, []);

  const resultFor = useCallback((input: I | null): R | null => (stored && input && stored.input === input ? stored.value : null), [stored]);

  return { busy, run, cancel, resultFor };
}