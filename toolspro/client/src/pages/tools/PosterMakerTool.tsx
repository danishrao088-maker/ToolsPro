import { useMemo, useState } from "react";
import SingleFileDrop from "../../components/tools/SingleFileDrop";
import { preparePhoto } from "../../lib/flyer/flyerImage";
import { pngToPdfSized } from "../../lib/flyer/flyerPdf";
import { svgToDataUrl } from "../../lib/image/dataUrl";
import { downloadBlob } from "../../lib/image/downloadBlob";
import { validateImageFile } from "../../lib/image/imageCore";
import { renderSvg } from "../../lib/image/svgRender";
import { svgOutputSize } from "../../lib/image/svgSize";
import { LOGO_FONTS, type LogoFont } from "../../lib/logo/logoSvg";
import { measureWithCanvas } from "../../lib/logo/measureText";
import {
  DEFAULT_POSTER,
  POSTER_COLORS,
  POSTER_LIMITS,
  POSTER_SIZES,
  POSTER_TEMPLATES,
  buildPosterSvg,
  posterDims,
  type PosterOptions,
  type PosterOrientation,
  type PosterSize,
  type PosterTemplate,
} from "../../lib/poster/posterSvg";

const DPI_CHOICES = [
  { value: 72, label: "72 dpi (screen, small file)" },
  { value: 150, label: "150 dpi (good for most uses)" },
  { value: 300, label: "300 dpi (best for printing, big file)" },
];
const field = "w-full rounded-md border border-line bg-surface px-3 py-2 text-body";
const label = "block text-sm font-medium text-heading";

export default function PosterMakerTool() {
  const [options, setOptions] = useState<PosterOptions>({ ...DEFAULT_POSTER, headline: "Your Headline" });
  const [touched, setTouched] = useState(false);
  const [photoName, setPhotoName] = useState("");
  const [photoError, setPhotoError] = useState("");
  const [dpi, setDpi] = useState(150);
  const [busy, setBusy] = useState(false);
  const [downloadError, setDownloadError] = useState("");

  function update<K extends keyof PosterOptions>(key: K, value: PosterOptions[K]) {
    setTouched(true);
    setOptions((current) => ({ ...current, [key]: value }));
  }

  const result = useMemo(() => buildPosterSvg(options, measureWithCanvas), [options]);
  const preview = result.ok ? svgToDataUrl(result.svg) : "";
  const dims = posterDims(options.size, options.orientation);
  const wantsPhoto = options.template !== "bold";

  async function choosePhoto(file: File) {
    setPhotoError("");
    const check = validateImageFile(file);
    if (!check.ok) return setPhotoError(check.error);
    const photo = await preparePhoto(file);
    if (!photo.ok) return setPhotoError(photo.error);
    setPhotoName(file.name);
    update("imageDataUrl", photo.dataUrl);
  }

  function removePhoto() {
    setPhotoName("");
    update("imageDataUrl", null);
  }

  async function download(kind: "png" | "pdf") {
    if (!result.ok) return;
    setBusy(true);
    setDownloadError("");
    try {
      const size = svgOutputSize({ width: result.width, height: result.height }, Math.round(dims.inchesWide * dpi));
      if (!size.ok) return setDownloadError(size.error);
      const png = await renderSvg(result.svg, size.width, size.height, "image/png", 1, "#ffffff");
      if (!png.ok) return setDownloadError(png.error);
      if (kind === "png") return downloadBlob(png.blob, "poster.png");
      const pdf = await pngToPdfSized(new Uint8Array(await png.blob.arrayBuffer()), dims.pointsWide, dims.pointsHigh);
      downloadBlob(new Blob([pdf], { type: "application/pdf" }), "poster.pdf");
    } catch {
      setDownloadError("The file could not be created. Try a lower resolution.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-4">
        <label className={label}>
          Headline
          <input className={`${field} mt-1`} value={options.headline} maxLength={POSTER_LIMITS.headline} onChange={(e) => update("headline", e.target.value)} />
        </label>
        <label className={label}>
          Subtitle (optional)
          <input className={`${field} mt-1`} value={options.subtitle} maxLength={POSTER_LIMITS.subtitle} onChange={(e) => update("subtitle", e.target.value)} />
        </label>
        <label className={label}>
          Details (optional, one per line)
          <textarea className={`${field} mt-1 min-h-24`} value={options.details} maxLength={POSTER_LIMITS.details} onChange={(e) => update("details", e.target.value)} placeholder={"Date and time\nPlace"} />
          <span className="mt-1 block text-xs font-normal text-body">Up to {POSTER_LIMITS.detailLines} lines. Write only what you want people to see.</span>
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className={label}>
            Design
            <select className={`${field} mt-1`} value={options.template} onChange={(e) => update("template", e.target.value as PosterTemplate)}>
              {POSTER_TEMPLATES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>
          <label className={label}>
            Letter style
            <select className={`${field} mt-1`} value={options.font} onChange={(e) => update("font", e.target.value as LogoFont)}>
              {LOGO_FONTS.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
          </label>
          <label className={label}>
            Paper size
            <select className={`${field} mt-1`} value={options.size} onChange={(e) => update("size", e.target.value as PosterSize)}>
              {POSTER_SIZES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
          <label className={label}>
            Direction
            <select className={`${field} mt-1`} value={options.orientation} onChange={(e) => update("orientation", e.target.value as PosterOrientation)}>
              <option value="portrait">Tall (portrait)</option>
              <option value="landscape">Wide (landscape)</option>
            </select>
          </label>
        </div>

        <fieldset className="space-y-2">
          <legend className="text-sm font-medium text-heading">Colour</legend>
          <div className="flex flex-wrap items-center gap-2">
            {POSTER_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                aria-label={`Use colour ${color}`}
                aria-pressed={options.accent === color}
                onClick={() => update("accent", color)}
                style={{ backgroundColor: color }}
                className={`h-8 w-8 rounded-full border-2 ${options.accent === color ? "border-heading" : "border-line"}`}
              />
            ))}
            <input type="color" aria-label="Choose another colour" className="h-8 w-12 rounded-md border border-line bg-surface" value={options.accent} onChange={(e) => update("accent", e.target.value)} />
          </div>
        </fieldset>

        {wantsPhoto && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-heading">Picture (optional)</p>
            {options.imageDataUrl ? (
              <div className="flex flex-wrap items-center gap-3 text-sm text-body">
                <span className="break-words">{photoName}</span>
                <button type="button" onClick={removePhoto} className="rounded-md border border-line px-3 py-1 text-heading">
                  Remove picture
                </button>
              </div>
            ) : (
              <SingleFileDrop accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp" title="Choose a picture, or drop it here" hint="It fills the picture area and is cut to fit." onFile={(file) => void choosePhoto(file)} />
            )}
            {photoError && <p role="alert" className="text-danger">{photoError}</p>}
          </div>
        )}
      </div>

      <div className="space-y-4">
        <div className="flex justify-center rounded-lg border border-line bg-surface-muted p-4">
          {result.ok ? (
            <img src={preview} alt={`Poster preview: ${options.headline}`} className="max-h-[40rem] w-auto max-w-full border border-line bg-white shadow-sm" />
          ) : (
            <p className={touched ? "text-danger" : "text-body"} role={touched ? "alert" : undefined}>
              {result.error}
            </p>
          )}
        </div>

        {result.ok && result.overflow && (
          <p role="alert" className="text-danger">
            The text does not fit well on this page. Make the headline shorter or choose a bigger paper size.
          </p>
        )}

        {result.ok && (
          <>
            <label className={`${label} max-w-xs`}>
              Quality
              <select className={`${field} mt-1`} value={dpi} onChange={(e) => setDpi(Number(e.target.value))}>
                {DPI_CHOICES.map((d) => (
                  <option key={d.value} value={d.value}>
                    {d.label}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex flex-wrap gap-3">
              <button type="button" onClick={() => void download("png")} disabled={busy} className="rounded-md bg-primary px-4 py-2 font-medium text-white disabled:opacity-50">
                {busy ? "Creating…" : "Download PNG"}
              </button>
              <button type="button" onClick={() => void download("pdf")} disabled={busy} className="rounded-md border border-line px-4 py-2 font-medium text-heading disabled:opacity-50">
                Download PDF
              </button>
            </div>
            {downloadError && <p role="alert" className="text-danger">{downloadError}</p>}
            <p className="text-sm text-body">The file looks exactly like the preview. The PDF holds the poster as a picture, so its text cannot be selected. Large sizes at 300 dpi need a lot of memory; if it fails, choose a lower quality.</p>
          </>
        )}
      </div>
    </div>
  );
}