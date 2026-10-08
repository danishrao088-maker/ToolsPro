import { useState } from "react";
import { RangeField } from "../../components/common/RangeField";
import { SelectField } from "../../components/common/SelectField";
import { ImageBatchWorkspace } from "../../components/tools/ImageBatchWorkspace";
import { useImageBatch } from "../../hooks/useImageBatch";
import { OUTPUT_FORMATS, getOutputFormat, qualityValue, type OutputMime } from "../../lib/image/imageCore";

interface ConverterSettings {
  format: OutputMime;
  quality: number;
  background: string;
}

const INITIAL: ConverterSettings = { format: "image/jpeg", quality: 90, background: "#ffffff" };

const FORMAT_OPTIONS = OUTPUT_FORMATS.map((format) => ({ value: format.mime, label: format.label }));

export default function ImageConverterTool() {
  const [settings, setSettings] = useState<ConverterSettings>(INITIAL);
  const update = (patch: Partial<ConverterSettings>) => setSettings((prev) => ({ ...prev, ...patch }));

  const batch = useImageBatch(settings, (_file, current) => ({
    mime: current.format,
    quality: qualityValue(current.quality),
    maxSide: null,
    background: current.background,
    note: "",
  }));

  const lossy = getOutputFormat(settings.format)?.lossy ?? false;

  return (
    <ImageBatchWorkspace batch={batch} idPrefix="convert" actionLabel="Convert images">
      <SelectField
        id="convert-format"
        label="Convert to"
        value={settings.format}
        onChange={(format) => update({ format })}
        options={FORMAT_OPTIONS}
        hint="PNG keeps transparent areas. JPG does not."
      />
      {lossy ? (
        <RangeField
          id="convert-quality"
          label="Quality"
          min={1}
          max={100}
          value={settings.quality}
          onChange={(quality) => update({ quality })}
          hint="Higher quality keeps more detail and makes a bigger file."
        />
      ) : null}
      {settings.format === "image/jpeg" ? (
        <div>
          <label htmlFor="convert-background" className="mb-1 block text-sm font-medium text-heading">
            Background colour for transparent areas
          </label>
          <input
            id="convert-background"
            type="color"
            value={settings.background}
            onChange={(e) => update({ background: e.target.value })}
            className="h-11 w-20 cursor-pointer rounded-lg border border-line bg-surface p-1"
          />
        </div>
      ) : null}
    </ImageBatchWorkspace>
  );
}