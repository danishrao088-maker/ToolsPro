import { useEffect, useRef, useState, type FormEvent } from "react";
import { Block, Facts, Mono, Note } from "../../components/tools/webResults";
import { MAX_ADDRESS_LENGTH, shortLinkUrl } from "../../lib/short/shortCore";
import { createShortLink, type ShortLink } from "../../lib/short/shortApi";
import { formatDate } from "../../lib/web/format";

type State = { kind: "idle" } | { kind: "loading" } | { kind: "error"; message: string } | { kind: "done"; link: ShortLink; url: string };

const field = "w-full rounded-md border border-line bg-surface px-3 py-2 text-body";
const PRIVACY =
  "To make the short link work, the address you enter is saved on our server until the link expires. Do not shorten addresses that contain private information, such as passwords or personal tokens.";
const RULES =
  "Anyone who has the short link can open it. Links that lead to harmful, deceptive or illegal pages are not allowed and can be removed. Links to other short link services, IP addresses and this website are refused.";

export default function UrlShortenerTool() {
  const [value, setValue] = useState("");
  const [state, setState] = useState<State>({ kind: "idle" });
  const [copied, setCopied] = useState(false);
  const controller = useRef<AbortController | null>(null);

  useEffect(
    () => () => {
      controller.current?.abort();
    },
    []
  );

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const address = value.trim();
    if (address === "") {
      setState({ kind: "error", message: "Enter the web address you want to shorten, for example https://example.com/a-long-page." });
      return;
    }
    controller.current?.abort();
    const current = new AbortController();
    controller.current = current;
    setCopied(false);
    setState({ kind: "loading" });
    try {
      const link = await createShortLink(address, current.signal);
      if (!current.signal.aborted) setState({ kind: "done", link, url: shortLinkUrl(window.location.origin, link.path) });
    } catch (error) {
      if (current.signal.aborted) return;
      setState({ kind: "error", message: error instanceof Error ? error.message : "Something went wrong. Please try again." });
    }
  }

  async function copy(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  const loading = state.kind === "loading";

  return (
    <div className="space-y-6">
      <form onSubmit={(event) => void submit(event)} className="space-y-3" noValidate>
        <label className="block text-sm font-medium text-heading">
          Long web address
          <input
            className={`${field} mt-1`}
            value={value}
            onChange={(event) => setValue(event.target.value)}
            placeholder="https://example.com/a-very-long-page-address"
            inputMode="url"
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
            maxLength={MAX_ADDRESS_LENGTH}
          />
        </label>
        <button type="submit" disabled={loading} className="rounded-md bg-primary px-4 py-2 font-medium text-white disabled:opacity-50">
          {loading ? "Shortening…" : "Shorten link"}
        </button>
        <p className="text-sm text-body">{PRIVACY}</p>
      </form>

      <div aria-live="polite" className="space-y-4">
        {state.kind === "loading" && (
          <p role="status" className="text-body">
            Creating your short link…
          </p>
        )}
        {state.kind === "error" && (
          <p role="alert" className="text-danger">
            {state.message}
          </p>
        )}
        {state.kind === "done" && (
          <Block title="Your short link">
            <label className="block text-sm font-medium text-heading">
              Short link
              <input className={`${field} mt-1`} readOnly value={state.url} onFocus={(event) => event.target.select()} />
            </label>
            <div className="flex flex-wrap items-center gap-3">
              <button type="button" onClick={() => void copy(state.url)} className="rounded-md bg-primary px-4 py-2 font-medium text-white">
                Copy link
              </button>
              <a className="underline" href={state.url} target="_blank" rel="noopener noreferrer">
                Open link in a new tab
              </a>
              {copied && (
                <span role="status" className="text-success">
                  Copied.
                </span>
              )}
            </div>
            <Facts
              items={[
                { label: "Goes to", value: <Mono>{state.link.destination}</Mono> },
                { label: "Works until", value: formatDate(state.link.expiresAt) },
              ]}
            />
          </Block>
        )}
      </div>

      <Note>{RULES}</Note>
    </div>
  );
}