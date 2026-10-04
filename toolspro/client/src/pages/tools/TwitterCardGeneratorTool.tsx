import { FormField } from "../../components/common/FormField";
import { SelectField } from "../../components/common/SelectField";
import { GeneratorLayout } from "../../components/tools/GeneratorLayout";
import { useGenerator } from "../../hooks/useGenerator";
import { CARD_TYPE_OPTIONS, generateTwitterCard, type TwitterCardInput } from "../../lib/tools/twitterCard";

const initial: TwitterCardInput = {
  card: "summary_large_image",
  title: "",
  description: "",
  imageUrl: "",
  imageAlt: "",
  site: "",
  creator: "",
};

export default function TwitterCardGeneratorTool() {
  const { values, setField, run, reset, result } = useGenerator(initial, generateTwitterCard);

  return (
    <GeneratorLayout
      result={result}
      onGenerate={run}
      onReset={reset}
      generateLabel="Generate card tags"
      outputLabel="HTML code"
      outputPlaceholder="Your Twitter Card tags will appear here."
      downloadFilename="twitter-card-tags.html"
      downloadMimeType="text/html;charset=utf-8"
    >
      <SelectField
        id="tw-card"
        label="Card type"
        value={values.card}
        onChange={setField("card")}
        options={CARD_TYPE_OPTIONS}
      />
      <FormField id="tw-title" label="Title" value={values.title} onChange={setField("title")} />
      <FormField
        id="tw-description"
        label="Description"
        multiline
        rows={3}
        required={false}
        value={values.description}
        onChange={setField("description")}
      />
      <FormField
        id="tw-image"
        label="Image URL"
        type="url"
        required={false}
        placeholder="https://example.com/image.png"
        value={values.imageUrl}
        onChange={setField("imageUrl")}
      />
      <FormField
        id="tw-image-alt"
        label="Image description"
        required={false}
        value={values.imageAlt}
        onChange={setField("imageAlt")}
        hint="Describes the image for people who cannot see it."
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          id="tw-site"
          label="Site handle"
          required={false}
          placeholder="@example"
          value={values.site}
          onChange={setField("site")}
        />
        <FormField
          id="tw-creator"
          label="Creator handle"
          required={false}
          placeholder="@example"
          value={values.creator}
          onChange={setField("creator")}
        />
      </div>
    </GeneratorLayout>
  );
}