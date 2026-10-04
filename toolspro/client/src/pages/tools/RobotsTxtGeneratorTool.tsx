import { FormField } from "../../components/common/FormField";
import { SelectField } from "../../components/common/SelectField";
import { GeneratorLayout } from "../../components/tools/GeneratorLayout";
import { useGenerator } from "../../hooks/useGenerator";
import { ROBOTS_MODE_OPTIONS, generateRobotsTxt, type RobotsTxtInput } from "../../lib/tools/robotsTxt";

const initial: RobotsTxtInput = { mode: "allow-all", disallowPaths: "", allowPaths: "", sitemaps: "" };

export default function RobotsTxtGeneratorTool() {
  const { values, setField, run, reset, result } = useGenerator(initial, generateRobotsTxt);

  return (
    <GeneratorLayout
      result={result}
      onGenerate={run}
      onReset={reset}
      generateLabel="Generate robots.txt"
      outputLabel="robots.txt"
      outputPlaceholder="Your robots.txt file will appear here."
      downloadFilename="robots.txt"
    >
      <SelectField
        id="robots-mode"
        label="Rule type"
        value={values.mode}
        onChange={setField("mode")}
        options={ROBOTS_MODE_OPTIONS}
      />
      {values.mode === "custom" ? (
        <>
          <FormField
            id="robots-disallow"
            label="Paths to block"
            multiline
            rows={4}
            required={false}
            placeholder={"/admin/\n/private/"}
            value={values.disallowPaths}
            onChange={setField("disallowPaths")}
            hint="One path per line. Each must start with /."
          />
          <FormField
            id="robots-allow"
            label="Paths to allow"
            multiline
            rows={3}
            required={false}
            placeholder="/admin/public/"
            value={values.allowPaths}
            onChange={setField("allowPaths")}
            hint="Use this to allow a path inside a blocked one."
          />
        </>
      ) : null}
      <FormField
        id="robots-sitemaps"
        label="Sitemap addresses"
        multiline
        rows={3}
        required={false}
        placeholder="https://example.com/sitemap.xml"
        value={values.sitemaps}
        onChange={setField("sitemaps")}
        hint="One full address per line."
      />
    </GeneratorLayout>
  );
}