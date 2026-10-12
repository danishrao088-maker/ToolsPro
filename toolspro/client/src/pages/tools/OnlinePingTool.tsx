import UrlCheckForm from "../../components/tools/UrlCheckForm";
import { Block, Facts, Mono, Note, StatusCode } from "../../components/tools/webResults";
import { formatMs } from "../../lib/web/format";
import type { PingResult } from "../../lib/web/webApi";

export default function OnlinePingTool() {
  return (
    <UrlCheckForm<PingResult>
      tool="ping"
      buttonLabel="Ping website"
      busyHint="Four requests are sent one after another. This can take up to 20 seconds."
      render={(result) => (
        <>
          <Block title="Summary">
            <Facts
              items={[
                { label: "Address", value: <Mono>{result.url}</Mono> },
                { label: "Sent / answered", value: `${result.sent} / ${result.received}` },
                { label: "Lost", value: `${result.lossPercent}%` },
                { label: "Fastest", value: result.minMs === null ? "—" : formatMs(result.minMs) },
                { label: "Average", value: result.avgMs === null ? "—" : formatMs(result.avgMs) },
                { label: "Slowest", value: result.maxMs === null ? "—" : formatMs(result.maxMs) },
              ]}
            />
          </Block>
          <Block title="Each request">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[20rem] text-left text-body">
                <thead>
                  <tr className="border-b border-line text-sm text-heading">
                    <th scope="col" className="py-2 pr-4">#</th>
                    <th scope="col" className="py-2 pr-4">Result</th>
                    <th scope="col" className="py-2">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {result.attempts.map((attempt) => (
                    <tr key={attempt.seq} className="border-b border-line">
                      <td className="py-2 pr-4">{attempt.seq}</td>
                      <td className="py-2 pr-4">{attempt.ok && attempt.status !== null ? <>Answered with <StatusCode status={attempt.status} /></> : <span className="text-danger">{attempt.error ?? "No answer"}</span>}</td>
                      <td className="py-2">{formatMs(attempt.timeMs)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Block>
          <Note>{result.note}</Note>
        </>
      )}
    />
  );
}
