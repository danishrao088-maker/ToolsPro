import type { ScoreCheck, ScoreResult } from "../../lib/web/webApi";
import { Block, Mono, Note } from "./webResults";

const STATUS: Record<ScoreCheck["status"], { symbol: string; label: string; className: string }> = {
  pass: { symbol: "✓", label: "Passed", className: "text-success" },
  warn: { symbol: "!", label: "Partly", className: "text-heading" },
  fail: { symbol: "✗", label: "Failed", className: "text-danger" },
};

const CLASS: Record<ScoreResult["verdict"], string> = {
  good: "text-success",
  needs_work: "text-heading",
  poor: "text-danger",
};

interface Props {
  result: ScoreResult;
  name: string; // jaise "Mobile score", screen reader ke liye
  verdicts: Record<ScoreResult["verdict"], string>;
}

// Score + har jaanch ki list. Mobile Friendly aur Page Speed dono isi se dikhte hain.
export default function ScoreReport({ result, name, verdicts }: Props) {
  return (
    <>
      <Block title="Result">
        <p className="break-all text-body">
          <Mono>{result.url}</Mono>
        </p>
        <p className={`text-4xl font-bold ${CLASS[result.verdict]}`}>
          {result.score} <span className="text-xl font-semibold">/ 100 · {verdicts[result.verdict]}</span>
        </p>
        <progress className="h-3 w-full" max={100} value={result.score} aria-label={`${name} ${result.score} out of 100`} />
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
      <Note>{result.note}</Note>
    </>
  );
}