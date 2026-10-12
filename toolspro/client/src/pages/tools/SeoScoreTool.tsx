import UrlCheckForm from "../../components/tools/UrlCheckForm";
import { Block, Mono, Note } from "../../components/tools/webResults";
import type { ScoreCheck, ScoreResult } from "../../lib/web/webApi";

const VERDICT: Record<ScoreResult["verdict"], { label: string; className: string }> = {
  good: { label: "Good", className: "text-success" },
  needs_work: { label: "Needs work", className: "text-heading" },
  poor: { label: "Poor", className: "text-danger" },
};

const STATUS: Record<ScoreCheck["status"], { symbol: string; label: string; className: string }> = {
  pass: { symbol: "✓", label: "Passed", className: "text-success" },
  warn: { symbol: "!", label: "Partly", className: "text-heading" },
  fail: { symbol: "✗", label: "Failed", className: "text-danger" },
};

export default function SeoScoreTool() {
  return (
    <UrlCheckForm<ScoreResult>
      tool="seo-score"
      buttonLabel="Check SEO score"
      render={(result) => {
        const verdict = VERDICT[result.verdict];
        return (
          <>
            <Block title="Score">
              <p className="break-all text-body">
                <Mono>{result.url}</Mono>
              </p>
              <p className={`text-4xl font-bold ${verdict.className}`}>
                {result.score} <span className="text-xl font-semibold">/ 100 · {verdict.label}</span>
              </p>
              <progress className="h-3 w-full" max={100} value={result.score} aria-label={`SEO score ${result.score} out of 100`} />
            </Block>
            <Block title="Checks">
              <ul className="divide-y divide-line">
                {result.checks.map((check) => {
                  const status = STATUS[check.status];
                  return (
                    <li key={check.id} className="space-y-1 py-3 first:pt-0 last:pb-0">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-medium text-heading">{check.label}</span>
                        <span className={`inline-flex items-center gap-1 text-sm font-medium ${status.className}`}>
                          <span aria-hidden="true">{status.symbol}</span>
                          {status.label} · {check.points}/{check.max}
                        </span>
                      </div>
                      <p className="text-sm text-body">{check.message}</p>
                    </li>
                  );
                })}
              </ul>
            </Block>
            <Note>{result.note} Only the HTML the server sends is checked, not content added later by JavaScript.</Note>
          </>
        );
      }}
    />
  );
}
