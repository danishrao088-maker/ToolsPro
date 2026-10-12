import UrlCheckForm from "../../components/tools/UrlCheckForm";
import { Block, FailureBox, Facts, Mono, Note, StatusCode } from "../../components/tools/webResults";
import { formatMs } from "../../lib/web/format";
import type { RedirectResult } from "../../lib/web/webApi";

const KIND: Record<string, string> = { permanent: "Permanent redirect", temporary: "Temporary redirect", final: "Final page" };

export default function RedirectCheckerTool() {
  return (
    <UrlCheckForm<RedirectResult>
      tool="redirects"
      buttonLabel="Check redirects"
      busyHint="Following each redirect can take a few seconds."
      render={(result) => (
        <>
          <Block title="Summary">
            <Facts
              items={[
                { label: "Started at", value: <Mono>{result.startUrl}</Mono> },
                { label: "Redirects", value: String(result.redirectCount) },
                { label: "Ended at", value: result.final ? <Mono>{result.final.url}</Mono> : "No final page was reached" },
                ...(result.final ? [{ label: "Final status", value: <StatusCode status={result.final.status} /> }] : []),
                { label: "Total time", value: formatMs(result.totalTimeMs) },
              ]}
            />
            {result.message && !result.failure && <p className="text-danger">{result.message}</p>}
          </Block>

          {result.failure && <FailureBox failure={result.failure} />}

          {result.hops.length > 0 && (
            <Block title="Step by step">
              <ol className="space-y-3">
                {result.hops.map((hop) => (
                  <li key={hop.step} className="rounded-md border border-line p-3">
                    <p className="text-heading">
                      <span className="font-semibold">Step {hop.step}: </span>
                      <StatusCode status={hop.status} /> {hop.statusText} <span className="text-sm text-body">({KIND[hop.kind]}, {formatMs(hop.timeMs)})</span>
                    </p>
                    <p className="mt-1 break-all text-sm text-body">{hop.url}</p>
                    {hop.location && <p className="mt-1 break-all text-sm text-body">Goes to: {hop.location}</p>}
                  </li>
                ))}
              </ol>
            </Block>
          )}

          {result.notes.length > 0 && (
            <Block title="Things to know">
              <ul className="list-disc space-y-1 pl-5 text-body">
                {result.notes.map((note) => (
                  <li key={note}>{note}</li>
                ))}
              </ul>
            </Block>
          )}
          <Note>The check follows up to 10 redirects. It runs from our server, so a site that treats visitors differently by country or device may redirect you differently.</Note>
        </>
      )}
    />
  );
}
