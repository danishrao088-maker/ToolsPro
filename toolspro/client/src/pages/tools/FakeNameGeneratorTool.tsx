import { SelectField } from "../../components/common/SelectField";
import { GeneratorLayout } from "../../components/tools/GeneratorLayout";
import { useGenerator } from "../../hooks/useGenerator";
import { COUNT_OPTIONS, REGION_OPTIONS, generateFakeNames, type FakeNameInput } from "../../lib/tools/fakeNames";

const initial: FakeNameInput = { region: "english", count: "10" };

export default function FakeNameGeneratorTool() {
  const { values, setField, run, reset, result } = useGenerator(initial, (v) => generateFakeNames(v));

  return (
    <GeneratorLayout
      result={result}
      onGenerate={run}
      onReset={reset}
      generateLabel="Generate names"
      outputLabel="Names"
      outputPlaceholder="Your names will appear here."
      downloadFilename="fake-names.txt"
    >
      <SelectField
        id="names-region"
        label="Name style"
        value={values.region}
        onChange={setField("region")}
        options={REGION_OPTIONS}
      />
      <SelectField
        id="names-count"
        label="How many"
        value={values.count}
        onChange={setField("count")}
        options={COUNT_OPTIONS}
      />
    </GeneratorLayout>
  );
}