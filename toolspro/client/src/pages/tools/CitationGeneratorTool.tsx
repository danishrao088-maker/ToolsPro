import { useState } from "react";
import { CircleCheck, Copy, RotateCcw } from "lucide-react";
import { Button } from "../../components/common/Button";
import { FormField } from "../../components/common/FormField";
import { InlineError } from "../../components/common/InlineError";
import { SelectField } from "../../components/common/SelectField";
import { useGenerator } from "../../hooks/useGenerator";
import {
  MONTH_OPTIONS,
  SOURCE_OPTIONS,
  STYLE_OPTIONS,
  generateCitation,
  type CitationInput,
  type CitationResult,
} from "../../lib/tools/citation";

const initial: CitationInput = {
  style: "apa",
  source: "book",
  authors: "",
  title: "",
  year: "",
  month: "",
  day: "",
  container: "",
  publisher: "",
  edition: "",
  volume: "",
  issue: "",
  pages: "",
  link: "",
};

type CopyOutcome = "rich" | "plain" | "failed";

const COPY_MESSAGES: Record<CopyOutcome, string> = {
  rich: "Copied. Italics are kept when you paste into Word or Google Docs.",
  plain: "Copied as plain text. Italics are not kept, so add them yourself.",
  failed: "Copying did not work. Select the citation and copy it yourself.",
};

// Pehle "rich" copy (HTML + plain), na chale to sirf plain text
async function copyCitation(html: string, plain: string): Promise<CopyOutcome> {
  if (typeof ClipboardItem !== "undefined") {
    try {
      await navigator.clipboard.write([
        new ClipboardItem({
          "text/html": new Blob([html], { type: "text/html" }),
          "text/plain": new Blob([plain], { type: "text/plain" }),
        }),
      ]);
      return "rich";
    } catch {
      // rich copy nahi hui, neeche plain text try karte hain
    }
  }
  try {
    await navigator.clipboard.writeText(plain);
    return "plain";
  } catch {
    return "failed";
  }
}

export default function CitationGeneratorTool() {
  const { values, setField, run, reset, result } = useGenerator(initial, generateCitation);
  const [copied, setCopied] = useState<{ forResult: CitationResult; outcome: CopyOutcome } | null>(null);
  const { source } = values;

  const handleCopy = async (current: CitationResult) => {
    if (!current.ok) return;
    const outcome = await copyCitation(current.html, current.plain);
    setCopied({ forResult: current, outcome });
  };

  // Copy ka paigham sirf usi nateeje ke saath dikhta hai jis par copy hua tha
  const copyMessage = copied && copied.forResult === result ? COPY_MESSAGES[copied.outcome] : "";

  const titleLabel = source === "book" ? "Book title" : source === "article" ? "Article title" : "Page title";
  const linkLabel = source === "article" ? "DOI or web address" : "Web address";

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        run();
      }}
      className="grid gap-6 lg:grid-cols-2"
    >
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField id="cite-style" label="Style" value={values.style} onChange={setField("style")} options={STYLE_OPTIONS} />
          <SelectField id="cite-source" label="Source" value={values.source} onChange={setField("source")} options={SOURCE_OPTIONS} />
        </div>

        <FormField
          id="cite-authors"
          label="Authors"
          multiline
          rows={3}
          required={false}
          value={values.authors}
          onChange={setField("authors")}
          placeholder={"Khan, Ali\nSmith, Mary Ann"}
          hint="One author per line, written as Family name, Given name. A name without a comma is treated as an organization, such as World Health Organization."
        />
        <FormField id="cite-title" label={titleLabel} value={values.title} onChange={setField("title")} />

        <FormField
          id="cite-year"
          label="Year"
          required={false}
          placeholder="2026"
          value={values.year}
          onChange={setField("year")}
          hint="Four digits. Leave empty if there is no date."
        />

        {source === "website" ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <SelectField id="cite-month" label="Month" value={values.month} onChange={setField("month")} options={MONTH_OPTIONS} />
            <FormField id="cite-day" label="Day" required={false} value={values.day} onChange={setField("day")} />
          </div>
        ) : null}

        {source === "book" ? (
          <>
            <FormField id="cite-publisher" label="Publisher" value={values.publisher} onChange={setField("publisher")} />
            <FormField
              id="cite-edition"
              label="Edition"
              required={false}
              value={values.edition}
              onChange={setField("edition")}
              hint="For example 2nd or Revised."
            />
          </>
        ) : null}

        {source === "article" ? (
          <>
            <FormField id="cite-journal" label="Journal name" value={values.container} onChange={setField("container")} />
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField id="cite-volume" label="Volume" required={false} value={values.volume} onChange={setField("volume")} />
              <FormField id="cite-issue" label="Issue" required={false} value={values.issue} onChange={setField("issue")} />
            </div>
            <FormField
              id="cite-pages"
              label="Pages"
              required={false}
              placeholder="45-67"
              value={values.pages}
              onChange={setField("pages")}
            />
          </>
        ) : null}

        {source === "website" ? (
          <FormField
            id="cite-site"
            label="Website name"
            required={false}
            value={values.container}
            onChange={setField("container")}
          />
        ) : null}

        <FormField
          id="cite-link"
          label={linkLabel}
          type="url"
          required={source === "website"}
          placeholder={source === "article" ? "10.1234/example" : "https://example.com/page"}
          value={values.link}
          onChange={setField("link")}
        />

        <div className="flex flex-wrap gap-3">
          <Button type="submit">Create citation</Button>
          <Button variant="ghost" onClick={reset}>
            <RotateCcw aria-hidden="true" size={18} />
            Reset
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        <p className="text-sm font-medium text-heading">Your citation</p>
        <div className="min-h-32 rounded-lg border border-line bg-surface p-4 text-heading">
          {result?.ok ? (
            <p>
              {result.segments.map((segment, index) =>
                segment.italic ? <i key={index}>{segment.text}</i> : <span key={index}>{segment.text}</span>
              )}
            </p>
          ) : (
            <p className="text-body">Your citation will appear here.</p>
          )}
        </div>
        <Button
          variant="ghost"
          disabled={!result?.ok}
          onClick={() => {
            if (result) void handleCopy(result);
          }}
        >
          <Copy aria-hidden="true" size={18} />
          Copy citation
        </Button>
        <p role="status" className="min-h-6">
          {copyMessage}
        </p>
      </div>

      <div className="space-y-3 lg:col-span-2">
        {result && !result.ok ? <InlineError message={result.error} /> : null}
        {result?.ok ? (
          <p role="status" className="flex items-start gap-2 text-success">
            <CircleCheck aria-hidden="true" size={18} className="mt-0.5 shrink-0" />
            {result.message}
          </p>
        ) : null}
      </div>
    </form>
  );
}