import { useState } from "react";
import { RangeField } from "../../components/common/RangeField";
import { SelectField } from "../../components/common/SelectField";
import { ImageBatchWorkspace } from "../../components/tools/ImageBatchWorkspace";
import { useImageBatch } from "../../hooks/useImageBatch";
import { detectImageType, qualityValue, resolveCompressFormat, type CompressFormatChoice } from "../../lib/image/imageCore";

interface CompressorSettings {
  format: CompressFormatChoice;
  quality: number;
  maxSide: string; // "" = asli size
}

const INITIAL: CompressorSettings = { format: "keep", quality: 75, maxSide: "" };

const FORMAT_OPTIONS: { value: CompressFormatChoice; label: string }[] = [
  { value: "keep", label: "Same as the original" },
  { value: "image/jpeg", label: "JPG" },
  { value: "image/webp", label: "WebP" },
];

const SIZE_OPTIONS = [
  { value: "", label: "Keep the original size" },
  ...[4096, 2560, 1920, 1280, 1024, 800].map((side) => ({
    value: String(side),
    label: `Longest side up to ${side} pixels`,
  })),
];

export default function ImageCompressorTool() {
  const [settings, setSettings] = useState<CompressorSettings>(INITIAL);
  const update = (patch: Partial<CompressorSettings>) => setSettings((prev) => ({ ...prev, ...patch }));

  const batch = useImageBatch(settings, (file, current) => {
    const { mime, note } = resolveCompressFormat(detectImageType(file), current.format);
    return {
      mime,
      quality: qualityValue(current.quality),
      maxSide: current.maxSide === "" ? null : Number(current.maxSide),
      background: "#ffffff",
      note,
    };
  });

  return (
    <ImageBatchWorkspace batch={batch} idPrefix="compress" actionLabel="Compress images">
      <RangeField
        id="compress-quality"
        label="Quality"
        min={1}
        max={100}
        value={settings.quality}
        onChange={(quality) => update({ quality })}
        hint="Lower quality makes a smaller file. PNG files are lossless, so quality does not change them."
      />
      <SelectField
        id="compress-size"
        label="Size"
        value={settings.maxSide}
        onChange={(maxSide) => update({ maxSide })}
        options={SIZE_OPTIONS}
        hint="Making the picture smaller is the biggest way to save space."
      />
      <SelectField
        id="compress-format"
        label="Save as"
        value={settings.format}
        onChange={(format) => update({ format })}
        options={FORMAT_OPTIONS}
        hint="If a file gets bigger, it was already well compressed. Try a lower quality, a smaller size or WebP."
      />
    </ImageBatchWorkspace>
  );
}