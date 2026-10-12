import { useState } from "react";
import { downloadBlob } from "../../lib/image/downloadBlob";
import { SUMMARY_LIMITS, formatSummary, summarize, type SummaryFormat, type SummaryResult } from "../../lib/text/summarize";

const field = "w-full rounded-md border border-line bg-surface px-3 py-2 text-body";
const COUNTS = Array.from({ length: SUMMARY_LIMITS.maxSentences }, (_, i) => i + 1);

export default function TextSummarizerTool() {
  const [text, setText] = useState("");
  const [count, setCount] = useState<number>(SUMMARY_LIMITS.defaultSentences);
  const [format, setFormat] = useState<SummaryFormat>("paragraph");
  const [result, setResult] = useState<SummaryResult | null>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  function run() {
    setCopied(false);
    const outcome = summarize(text, count);
    if (outcome.ok) {
      setResult(outcome.result);
      setError("");
    } else {
      setResult(null);
      setError(outcome.error);
    }
  }

  const output = result ? formatSummary(result.sentences, format) : "";

  async function copy() {
    try {
      await navigator.clipboard.writeText(output);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  function download() {
    downloadBlob(new Blob([output], { type: "text/plain;charset=utf-8" }), "summary.txt");
  }

  return (
    <div className="space-y-5">
      <label className="block text-sm font-medium text-heading">
        Your text
        <textarea
          className={`${field} mt-1 min-h-48`}
          value={text}
          onChange={(event) => {
            setText(event.target.value);
            setResult(null);
            setError("");
          }}
          maxLength={SUMMARY_LIMITS.chars}
          placeholder="Paste or type the text you want to shorten."
        />
      </label>
      <div className="flex flex-wrap gap-4">
        <label className="block text-sm font-medium text-heading">
          Sentences to keep
          <select
            className={`${field} mt-1`}
            value={count}
            onChange={(event) => {
              setCount(Number(event.target.value));
              setResult(null);
            }}
          >
            {COUNTS.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm font-medium text-heading">
          Show as
          <select className={`${field} mt-1`} value={format} onChange={(event) => setFormat(event.target.value as SummaryFormat)}>
            <option value="paragraph">One paragraph</option>
            <option value="bullets">Bullet list</option>
          </select>
        </label>
      </div>
      <button type="button" onClick={run} className="rounded-md bg-primary px-4 py-2 font-medium text-white">
        Summarize
      </button>

      <div aria-live="polite" className="space-y-3">
        {error && (
          <p role="alert" className="text-danger">
            {error}
          </p>
        )}
        {result && (
          <section className="space-y-3 rounded-lg border border-line p-4">
            <h3 className="text-base font-semibold text-heading">Summary</h3>
            {result.alreadyShort && <p className="text-sm text-body">Your text has only {result.totalSentences} sentence{result.totalSentences === 1 ? "" : "s"}, so it is shown in full.</p>}
            <p className="whitespace-pre-wrap text-body">{output}</p>
            <p className="text-sm text-body">
              {result.sentences.length} of {result.totalSentences} sentences · {result.summaryWords.toLocaleString("en-US")} of {result.originalWords.toLocaleString("en-US")} words
            </p>
            <div className="flex flex-wrap gap-3">
              <button type="button" onClick={() => void copy()} className="rounded-md border border-line px-4 py-2 font-medium text-heading">
                {copied ? "Copied" : "Copy"}
              </button>
              <button type="button" onClick={download} className="rounded-md border border-line px-4 py-2 font-medium text-heading">
                Download as text file
              </button>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}