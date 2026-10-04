import { useMemo, useState } from "react";
import { Eraser } from "lucide-react";
import { Button } from "../../components/common/Button";
import { CheckboxField } from "../../components/common/CheckboxField";
import { InlineError } from "../../components/common/InlineError";
import { SelectField } from "../../components/common/SelectField";
import { ToolTextarea } from "../../components/tools/ToolTextarea";
import { plural } from "../../lib/format";
import {
  PHRASE_LENGTHS,
  PHRASE_OPTIONS,
  analyzeKeywords,
  type PhraseValue,
} from "../../lib/tools/keywordDensity";

export default function KeywordDensityCheckerTool() {
  const [text, setText] = useState("");
  const [phrase, setPhrase] = useState<PhraseValue>("1");
  const [ignoreCommon, setIgnoreCommon] = useState(true);

  // Derived state: nateeja text/options se nikalta hai, alag state mein nahi rakhte
  const analysis = useMemo(
    () =>
      text.trim() === ""
        ? null
        : analyzeKeywords(text, { phraseLength: PHRASE_LENGTHS[phrase], ignoreCommonWords: ignoreCommon, limit: 20 }),
    [text, phrase, ignoreCommon]
  );

  return (
    <div className="space-y-6">
      <ToolTextarea
        id="keyword-input"
        label="Your text"
        value={text}
        onChange={setText}
        placeholder="Paste or type your text here."
        rows={10}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField id="keyword-phrase" label="Count" value={phrase} onChange={setPhrase} options={PHRASE_OPTIONS} />
        <div className="self-end">
          <CheckboxField
            id="keyword-stop"
            label="Ignore common English words"
            hint="Hides words such as the, and and of."
            checked={ignoreCommon}
            onChange={setIgnoreCommon}
          />
        </div>
      </div>

      <div>
        <Button variant="ghost" onClick={() => setText("")}>
          <Eraser aria-hidden="true" size={18} />
          Clear
        </Button>
      </div>

      {analysis && !analysis.ok ? <InlineError message={analysis.error} /> : null}

      <p role="status" className="min-h-6">
        {analysis?.ok
          ? `${plural(analysis.totalWords, "word")} in total. ${plural(analysis.distinctPhrases, "different entry", "different entries")} shown below (top 20).`
          : text.trim() === ""
            ? "Add some text to see the results."
            : ""}
      </p>

      {analysis?.ok && analysis.rows.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <caption className="sr-only">Most frequent words or phrases</caption>
            <thead>
              <tr className="border-b border-line text-heading">
                <th scope="col" className="py-2 pr-4 font-medium">
                  Word or phrase
                </th>
                <th scope="col" className="py-2 pr-4 text-right font-medium">
                  Times used
                </th>
                <th scope="col" className="py-2 text-right font-medium">
                  Density
                </th>
              </tr>
            </thead>
            <tbody>
              {analysis.rows.map((row) => (
                <tr key={row.phrase} className="border-b border-line">
                  <td className="py-2 pr-4 text-heading">{row.phrase}</td>
                  <td className="py-2 pr-4 text-right tabular-nums">{row.count}</td>
                  <td className="py-2 text-right tabular-nums">{row.density.toFixed(2)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}