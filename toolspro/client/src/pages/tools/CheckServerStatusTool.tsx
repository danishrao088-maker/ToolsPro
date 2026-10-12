import UrlCheckForm from "../../components/tools/UrlCheckForm";
import { Block, FailureBox, Facts, HeadersList, Mono, Note, StatusSummary } from "../../components/tools/webResults";
import { formatMs } from "../../lib/web/format";
import type { StatusResult } from "../../lib/web/webApi";

export default function CheckServerStatusTool() {
  return (
    <UrlCheckForm<StatusResult>
      tool="status"
      buttonLabel="Check status"
      render={(result) =>
        result.reachable ? (
          <>
            <Block title="Result">
              <StatusSummary status={result.status} statusText={result.statusText} />
              <Facts
                items={[
                  { label: "Address", value: <Mono>{result.url}</Mono> },
                  { label: "Answered in", value: formatMs(result.timeMs) },
                  { label: "Server address", value: <Mono>{result.address}</Mono> },
                  { label: "Secure (HTTPS)", value: result.secure ? "Yes" : "No, the address starts with http://" },
                  ...(result.redirectsTo ? [{ label: "Redirects to", value: <Mono>{result.redirectsTo}</Mono> }] : []),
                ]}
              />
            </Block>
            <HeadersList headers={result.headers} />
            <Note>{result.note} This tool does not follow redirects; use the Redirect Checker to see where an address ends up.</Note>
          </>
        ) : (
          <>
            <FailureBox failure={result.failure} timeMs={result.timeMs} />
            <Note>{result.note}</Note>
          </>
        )
      }
    />
  );
}
