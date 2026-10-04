import { CheckboxField } from "../../components/common/CheckboxField";
import { FormField } from "../../components/common/FormField";
import { SelectField } from "../../components/common/SelectField";
import { GeneratorLayout } from "../../components/tools/GeneratorLayout";
import { useGenerator } from "../../hooks/useGenerator";
import { ROBOTS_OPTIONS, generateMetaTags, type MetaTagInput } from "../../lib/tools/metaTags";

const initial: MetaTagInput = {
  title: "",
  description: "",
  keywords: "",
  author: "",
  canonicalUrl: "",
  robots: "index, follow",
  includeViewport: true,
};

export default function MetaTagGeneratorTool() {
  const { values, setField, run, reset, result } = useGenerator(initial, generateMetaTags);

  return (
    <GeneratorLayout
      result={result}
      onGenerate={run}
      onReset={reset}
      generateLabel="Generate meta tags"
      outputLabel="HTML code"
      outputPlaceholder="Your meta tags will appear here."
      downloadFilename="meta-tags.html"
      downloadMimeType="text/html;charset=utf-8"
    >
      <FormField
        id="meta-title"
        label="Page title"
        value={values.title}
        onChange={setField("title")}
        hint={`${values.title.length} characters`}
      />
      <FormField
        id="meta-description"
        label="Page description"
        multiline
        rows={3}
        value={values.description}
        onChange={setField("description")}
        hint={`${values.description.length} characters`}
      />
      <FormField
        id="meta-keywords"
        label="Keywords"
        required={false}
        value={values.keywords}
        onChange={setField("keywords")}
        hint="Separate with commas. Most search engines ignore this tag."
      />
      <FormField id="meta-author" label="Author" required={false} value={values.author} onChange={setField("author")} />
      <FormField
        id="meta-canonical"
        label="Canonical URL"
        type="url"
        required={false}
        placeholder="https://example.com/page"
        value={values.canonicalUrl}
        onChange={setField("canonicalUrl")}
      />
      <SelectField
        id="meta-robots"
        label="Search engine instructions"
        value={values.robots}
        onChange={setField("robots")}
        options={ROBOTS_OPTIONS}
      />
      <CheckboxField
        id="meta-viewport"
        label="Include the responsive viewport tag"
        hint="Recommended for pages that should work well on phones."
        checked={values.includeViewport}
        onChange={setField("includeViewport")}
      />
    </GeneratorLayout>
  );
}