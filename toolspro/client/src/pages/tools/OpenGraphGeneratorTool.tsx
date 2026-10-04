import { FormField } from "../../components/common/FormField";
import { SelectField } from "../../components/common/SelectField";
import { GeneratorLayout } from "../../components/tools/GeneratorLayout";
import { useGenerator } from "../../hooks/useGenerator";
import { OG_TYPE_OPTIONS, generateOpenGraph, type OpenGraphInput } from "../../lib/tools/openGraph";

const initial: OpenGraphInput = {
  title: "",
  description: "",
  type: "website",
  url: "",
  imageUrl: "",
  imageAlt: "",
  siteName: "",
};

export default function OpenGraphGeneratorTool() {
  const { values, setField, run, reset, result } = useGenerator(initial, generateOpenGraph);

  return (
    <GeneratorLayout
      result={result}
      onGenerate={run}
      onReset={reset}
      generateLabel="Generate Open Graph tags"
      outputLabel="HTML code"
      outputPlaceholder="Your Open Graph tags will appear here."
      downloadFilename="open-graph-tags.html"
      downloadMimeType="text/html;charset=utf-8"
    >
      <FormField id="og-title" label="Title" value={values.title} onChange={setField("title")} />
      <FormField
        id="og-description"
        label="Description"
        multiline
        rows={3}
        required={false}
        value={values.description}
        onChange={setField("description")}
      />
      <SelectField
        id="og-type"
        label="Content type"
        value={values.type}
        onChange={setField("type")}
        options={OG_TYPE_OPTIONS}
      />
      <FormField
        id="og-url"
        label="Page URL"
        type="url"
        placeholder="https://example.com/page"
        value={values.url}
        onChange={setField("url")}
      />
      <FormField
        id="og-image"
        label="Image URL"
        type="url"
        required={false}
        placeholder="https://example.com/image.png"
        value={values.imageUrl}
        onChange={setField("imageUrl")}
        hint="Use a full address to an image that is publicly available on the web."
      />
      <FormField
        id="og-image-alt"
        label="Image description"
        required={false}
        value={values.imageAlt}
        onChange={setField("imageAlt")}
        hint="Describes the image for people who cannot see it."
      />
      <FormField
        id="og-site-name"
        label="Site name"
        required={false}
        value={values.siteName}
        onChange={setField("siteName")}
      />
    </GeneratorLayout>
  );
}