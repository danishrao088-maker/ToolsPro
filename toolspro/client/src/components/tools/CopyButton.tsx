import { useEffect, useRef, useState } from "react";
import { Check, Copy, TriangleAlert } from "lucide-react";
import { Button } from "../common/Button";

type CopyState = "idle" | "copied" | "failed";

export function CopyButton({ text, disabled = false }: { text: string; disabled?: boolean }) {
  const [state, setState] = useState<CopyState>("idle");
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const onClick = async () => {
    window.clearTimeout(timer.current);
    try {
      await navigator.clipboard.writeText(text);
      setState("copied");
    } catch {
      setState("failed"); // permission nahi mili, ya browser ne block kiya
    }
    timer.current = window.setTimeout(() => setState("idle"), 2500);
  };

  const label = state === "copied" ? "Copied" : state === "failed" ? "Copy failed" : "Copy";
  const Icon = state === "copied" ? Check : state === "failed" ? TriangleAlert : Copy;

  return (
    <>
      <Button variant="outline" onClick={() => void onClick()} disabled={disabled}>
        <Icon aria-hidden="true" size={18} />
        {label}
      </Button>
      <span role="status" className="sr-only">
        {state === "copied" ? "Copied to clipboard." : state === "failed" ? "Could not copy. Select the text and copy it manually." : ""}
      </span>
    </>
  );
}