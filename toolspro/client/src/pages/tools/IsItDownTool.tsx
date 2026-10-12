import UrlCheckForm from "../../components/tools/UrlCheckForm";
import { Block, FailureBox, Facts, Mono, Note, StatusCode } from "../../components/tools/webResults";
import { formatMs } from "../../lib/web/format";
import type { DownResult } from "../../lib/web/webApi";

const VERDICTS: Record<DownResult["verdict"], { title: string; className: string }> = {
  up: { title: "It is up", className: "text-success" },
  reachable_with_errors: { title: "The server answers, but with an error", className: "text-danger" },
  down: { title: "It looks down", className: "text-danger" },
  unknown: { title: "We could not tell", className: "text-heading" },
};

export default function IsItDownTool() {
  return (
    <UrlCheckForm<DownResult>
      tool="is-it-down"
      buttonLabel="Check now"
      render={(result) => {
        const verdict = VERDICTS[result.verdict];
        return (
          <>
            <Block title="Result">
              <p className={`text-2xl font-bold ${verdict.className}`}>{verdict.title}</p>
              <p className="text-body">{result.message}</p>
              {result.slow && <p className="text-body">The answer took longer than 3 seconds, so the site is slow.</p>}
              <Facts
                items={[
                  { label: "Address", value: <Mono>{result.url}</Mono> },
                  ...(result.status !== null ? [{ label: "Status", value: <StatusCode status={result.status} /> }] : []),
                  ...(result.finalUrl && result.finalUrl !== result.url ? [{ label: "Ended at", value: <Mono>{result.finalUrl}</Mono> }] : []),
                  { label: "Time", value: formatMs(result.timeMs) },
                ]}
              />
            </Block>
            {result.failure && <FailureBox failure={result.failure} />}
            <Note>{result.note}</Note>
          </>
        );
      }}
    />
  );
}
