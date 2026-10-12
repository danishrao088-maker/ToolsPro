import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { callWebTool, type WebToolName } from "../../lib/web/webApi";

type State<T> = { kind: "idle" } | { kind: "loading" } | { kind: "error"; message: string } | { kind: "done"; result: T; address: string };

interface Props<T> {
  tool: WebToolName;
  buttonLabel: string;
  busyHint?: string;
  label?: string;
  placeholder?: string;
  emptyMessage?: string;
  privacyNote?: string;
  render: (result: T, address: string) => ReactNode;
}

const field = "w-full rounded-md border border-line bg-surface px-3 py-2 text-body";

// Sab web tools ka ek jaisa form: address likhein, server check karta hai, nateeja neeche aata hai.
const DEFAULT_PRIVACY = "To check a site, this tool sends the address you type to our server, and our server opens that page for you. The results are not saved by the tool.";

export default function UrlCheckForm<T>({ tool, buttonLabel, busyHint, label = "Website address", placeholder = "example.com", emptyMessage = "Enter a web address, for example example.com.", privacyNote = DEFAULT_PRIVACY, render }: Props<T>) {
  const [address, setAddress] = useState("");
  const [state, setState] = useState<State<T>>({ kind: "idle" });
  const controller = useRef<AbortController | null>(null);

  useEffect(
    () => () => {
      controller.current?.abort();
    },
    []
  );

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = address.trim();
    if (value === "") {
      setState({ kind: "error", message: emptyMessage });
      return;
    }
    controller.current?.abort();
    const current = new AbortController();
    controller.current = current;
    setState({ kind: "loading" });
    try {
      const result = await callWebTool<T>(tool, value, current.signal);
      if (!current.signal.aborted) setState({ kind: "done", result, address: value });
    } catch (error) {
      if (current.signal.aborted) return;
      setState({ kind: "error", message: error instanceof Error ? error.message : "Something went wrong. Please try again." });
    }
  }

  const loading = state.kind === "loading";

  return (
    <div className="space-y-6">
      <form onSubmit={(event) => void submit(event)} className="space-y-3" noValidate>
        <label className="block text-sm font-medium text-heading">
          {label}
          <input
            className={`${field} mt-1`}
            value={address}
            onChange={(event) => setAddress(event.target.value)}
            placeholder={placeholder}
            inputMode="url"
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
            maxLength={2048}
          />
        </label>
        <button type="submit" disabled={loading} className="rounded-md bg-primary px-4 py-2 font-medium text-white disabled:opacity-50">
          {loading ? "Checking…" : buttonLabel}
        </button>
        <p className="text-sm text-body">{privacyNote}</p>
      </form>

      <div aria-live="polite" className="space-y-4">
        {state.kind === "loading" && <p role="status" className="text-body">Checking… {busyHint ?? "This can take a few seconds."}</p>}
        {state.kind === "error" && <p role="alert" className="text-danger">{state.message}</p>}
        {state.kind === "done" && render(state.result, state.address)}
      </div>
    </div>
  );
}