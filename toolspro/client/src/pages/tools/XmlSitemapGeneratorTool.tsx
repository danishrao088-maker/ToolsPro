import { FormField } from "../../components/common/FormField";
import { SelectField } from "../../components/common/SelectField";
import { GeneratorLayout } from "../../components/tools/GeneratorLayout";
import { useGenerator } from "../../hooks/useGenerator";
import {
  CHANGE_FREQUENCIES,
  PRIORITIES,
  generateSitemap,
  type ChangeFrequency,
  type SitemapInput,
} from "../../lib/tools/sitemap";

const initial: SitemapInput = { urls: "", changefreq: "", priority: "", lastmod: "" };

const frequencyOptions: { value: ChangeFrequency; label: string }[] = [
  { value: "", label: "Not set" },
  ...CHANGE_FREQUENCIES.map((value) => ({ value, label: value.charAt(0).toUpperCase() + value.slice(1) })),
];

const priorityOptions: { value: string; label: string }[] = [
  { value: "", label: "Not set" },
  ...PRIORITIES.map((value) => ({ value, label: value })),
];

export default function XmlSitemapGeneratorTool() {
  const { values, setField, run, reset, result } = useGenerator(initial, generateSitemap);
  const lineCount = values.urls.split(/\r?\n/).filter((line) => line.trim() !== "").length;

  return (
    <GeneratorLayout
      result={result}
      onGenerate={run}
      onReset={reset}
      generateLabel="Generate sitemap"
      outputLabel="sitemap.xml"
      outputPlaceholder="Your sitemap will appear here."
      downloadFilename="sitemap.xml"
      downloadMimeType="application/xml;charset=utf-8"
    >
      <FormField
        id="sitemap-urls"
        label="Page addresses"
        multiline
        rows={9}
        placeholder={"https://example.com/\nhttps://example.com/about"}
        value={values.urls}
        onChange={setField("urls")}
        hint={`One full address per line. ${lineCount} ${lineCount === 1 ? "address" : "addresses"} entered.`}
      />
      <FormField
        id="sitemap-lastmod"
        label="Last modified"
        type="date"
        required={false}
        value={values.lastmod}
        onChange={setField("lastmod")}
        hint="The same date is added to every address."
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField
          id="sitemap-changefreq"
          label="Change frequency"
          value={values.changefreq}
          onChange={setField("changefreq")}
          options={frequencyOptions}
        />
        <SelectField
          id="sitemap-priority"
          label="Priority"
          value={values.priority}
          onChange={setField("priority")}
          options={priorityOptions}
        />
      </div>
    </GeneratorLayout>
  );
}