import { useState } from "react";
import {
  GRAMMAR_LIMITS,
  KIND_LABEL,
  applyAllFixes,
  applyFix,
  checkText,
  contextOf,
  countByKind,
  type Issue,
  type IssueKind,
} from "../../lib/text/grammar";

const field = "w-full rounded-md border border-line bg-surface px-3 py-2 text-body";
const KINDS: IssueKind[] = ["spelling", "grammar", "punctuation", "style"];

const NOTE =
  "This checker follows a fixed set of rules. It catches common slips such as repeated words, a or an, capital letters, spacing and some often confused words. It does not understand meaning, so it can miss mistakes and sometimes flag text that is fine. Only a short list of common misspellings is checked here; your browser also underlines other misspelled words as you type.";

// Khali jagah (space) nazar nahi aati, is liye nishan dikhate hain
const visible = (value: string) => (value.trim() === "" ? "␣".repeat(Math.min(Math.max(value.length, 1), 5)) : value);

export default function GrammarCheckerTool() {
  const [text, setText] = useState("");
  const [issues, setIssues] = useState<Issue[] | null>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [fixedCount, setFixedCount] = useState(0);

  function run() {
    setCopied(false);
    setFixedCount(0);
    if (text.trim() === "") {
      setIssues(null);
      setError("Type or paste some text to check.");
      return;
    }
    setError("");
    setIssues(checkText(text));
  }

  function fixOne(issue: Issue) {
    const next = applyFix(text, issue);
    setText(next);
    setIssues(checkText(next));
    setFixedCount((n) => n + 1);
    setCopied(false);
  }

  function fixAll() {
    if (!issues) return;
    const result = applyAllFixes(text, issues);
    setText(result.text);
    setIssues(checkText(result.text));
    setFixedCount((n) => n + result.count);
    setCopied(false);
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  const fixable = issues ? issues.filter((issue) => issue.replacement !== null).length : 0;
  const counts = issues ? countByKind(issues) : null;
  const shown = issues ? issues.slice(0, GRAMMAR_LIMITS.shown) : [];

  return (
    <div className="space-y-5">
      <label className="block text-sm font-medium text-heading">
        Your text
        <textarea
          className={`${field} mt-1 min-h-56`}
          value={text}
          spellCheck
          maxLength={GRAMMAR_LIMITS.chars}
          onChange={(event) => {
            setText(event.target.value);
            setIssues(null);
            setError("");
            setCopied(false);
          }}
          placeholder="Paste or type the text you want to check."
        />
      </label>
      <p className="text-sm text-body">
        {text.length.toLocaleString("en-US")} of {GRAMMAR_LIMITS.chars.toLocaleString("en-US")} characters
      </p>
      <div className="flex flex-wrap gap-3">
        <button type="button" onClick={run} className="rounded-md bg-primary px-4 py-2 font-medium text-white">
          Check text
        </button>
        {text !== "" && (
          <button type="button" onClick={() => void copy()} className="rounded-md border border-line px-4 py-2 font-medium text-heading">
            {copied ? "Copied" : "Copy text"}
          </button>
        )}
      </div>

      <div aria-live="polite" className="space-y-4">
        {error && (
          <p role="alert" className="text-danger">
            {error}
          </p>
        )}
        {issues && counts && (
          <>
            <section className="space-y-3 rounded-lg border border-line p-4">
              <h3 className="text-base font-semibold text-heading">
                {issues.length === 0 ? "No issues found" : `${issues.length} possible issue${issues.length === 1 ? "" : "s"}`}
              </h3>
              {fixedCount > 0 && (
                <p className="text-sm text-success">
                  {fixedCount} fix{fixedCount === 1 ? "" : "es"} applied. The text above is updated.
                </p>
              )}
              {issues.length === 0 ? (
                <p className="text-body">Our rules did not find anything to change. This does not mean the text is perfect.</p>
              ) : (
                <>
                  <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-body">
                    {KINDS.filter((kind) => counts[kind] > 0).map((kind) => (
                      <li key={kind}>
                        {KIND_LABEL[kind]}: {counts[kind]}
                      </li>
                    ))}
                  </ul>
                  {fixable > 0 && (
                    <button type="button" onClick={fixAll} className="rounded-md border border-line px-4 py-2 font-medium text-heading">
                      Apply all {fixable} suggested fix{fixable === 1 ? "" : "es"}
                    </button>
                  )}
                </>
              )}
            </section>

            {shown.length > 0 && (
              <section className="space-y-3">
                <h3 className="text-base font-semibold text-heading">Issues</h3>
                {issues.length > shown.length && (
                  <p className="text-sm text-body">
                    Showing the first {shown.length} of {issues.length}. Fix these and check again to see the rest.
                  </p>
                )}
                <ol className="space-y-3">
                  {shown.map((issue) => {
                    const context = contextOf(text, issue);
                    return (
                      <li key={issue.id} className="space-y-2 rounded-lg border border-line p-3">
                        <p className="text-sm font-medium text-heading">
                          {KIND_LABEL[issue.kind]} · <span className="font-normal text-body">{issue.message}</span>
                        </p>
                        <p className="break-words text-body">
                          {context.before}
                          <mark className="rounded bg-surface px-0.5 font-semibold text-heading underline decoration-danger decoration-2 underline-offset-2">{visible(context.match)}</mark>
                          {context.after}
                        </p>
                        {issue.replacement !== null && (
                          <div className="flex flex-wrap items-center gap-3">
                            <p className="text-sm text-body">
                              Suggestion: <span className="font-medium text-heading">{issue.replacement === "" ? "remove it" : visible(issue.replacement)}</span>
                            </p>
                            <button
                              type="button"
                              onClick={() => fixOne(issue)}
                              aria-label={`Apply fix: ${issue.message}`}
                              className="rounded-md border border-line px-3 py-1 text-sm font-medium text-heading"
                            >
                              Apply fix
                            </button>
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ol>
              </section>
            )}
            <p className="text-sm text-body">{NOTE}</p>
          </>
        )}
      </div>
    </div>
  );
}