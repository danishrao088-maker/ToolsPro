import { useMemo, useState } from "react";
import { svgToDataUrl } from "../../lib/image/dataUrl";
import { downloadBlob } from "../../lib/image/downloadBlob";
import { renderSvg } from "../../lib/image/svgRender";
import { svgOutputSize } from "../../lib/image/svgSize";
import { DEFAULT_LOGO, LOGO_FONTS, LOGO_ICONS, LOGO_LAYOUTS, MAX_NAME_LENGTH, MAX_TAGLINE_LENGTH, buildLogoSvg, type LogoFont, type LogoIcon, type LogoLayout, type LogoOptions } from "../../lib/logo/logoSvg";
import { measureWithCanvas } from "../../lib/logo/measureText";

const PNG_WIDTHS = [512, 1024, 2048, 4096];
const field = "w-full rounded-md border border-line bg-surface px-3 py-2 text-body";
const label = "block text-sm font-medium text-heading";

export default function LogoMakerTool() {
  const [options, setOptions] = useState<LogoOptions>({ ...DEFAULT_LOGO, name: "" });
  const [touched, setTouched] = useState(false);
  const [pngWidth, setPngWidth] = useState(1024);
  const [transparent, setTransparent] = useState(true);
  const [pageBackground, setPageBackground] = useState("#ffffff");
  const [busy, setBusy] = useState(false);
  const [downloadError, setDownloadError] = useState("");

  function update<K extends keyof LogoOptions>(key: K, value: LogoOptions[K]) {
    setTouched(true);
    setOptions((current) => ({ ...current, [key]: value }));
  }

  const effective: LogoOptions = useMemo(() => ({ ...options, background: transparent ? null : pageBackground }), [options, transparent, pageBackground]);
  const result = useMemo(() => buildLogoSvg(effective, measureWithCanvas), [effective]);
  const preview = result.ok ? svgToDataUrl(result.svg) : "";

  function downloadSvg() {
    if (result.ok) downloadBlob(new Blob([result.svg], { type: "image/svg+xml" }), "logo.svg");
  }

  async function downloadPng() {
    if (!result.ok) return;
    const size = svgOutputSize({ width: result.width, height: result.height }, pngWidth);
    if (!size.ok) return setDownloadError(size.error);
    setBusy(true);
    setDownloadError("");
    const png = await renderSvg(result.svg, size.width, size.height, "image/png", 1, effective.background);
    setBusy(false);
    if (png.ok) downloadBlob(png.blob, "logo.png");
    else setDownloadError(png.error);
  }

  const showIcon = options.layout !== "text";

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-4">
<label className={label}>
  Name
  <input
    className={`${field} mt-1`}
    type="text"
    value={options.name}
    placeholder="Your Name"
    maxLength={MAX_NAME_LENGTH}
    onChange={(e) => update("name", e.target.value)}
  />
</label>
        <label className={label}>
          Tagline (optional)
          <input className={`${field} mt-1`} value={options.tagline} maxLength={MAX_TAGLINE_LENGTH} onChange={(e) => update("tagline", e.target.value)} />
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className={label}>
            Layout
            <select className={`${field} mt-1`} value={options.layout} onChange={(e) => update("layout", e.target.value as LogoLayout)}>
              {LOGO_LAYOUTS.map((l) => (
                <option key={l.value} value={l.value}>
                  {l.label}
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
        </div>

        {showIcon && (
          <fieldset className="space-y-3">
            <legend className="text-sm font-medium text-heading">Symbol</legend>
            <div className="flex flex-wrap gap-2">
              {LOGO_ICONS.map((icon) => (
                <button
                  key={icon.value}
                  type="button"
                  aria-pressed={options.icon === icon.value}
                  onClick={() => update("icon", icon.value as LogoIcon)}
                  className={`rounded-md border px-3 py-1.5 text-sm ${options.icon === icon.value ? "border-primary bg-primary text-white" : "border-line text-heading"}`}
                >
                  {icon.label}
                </button>
              ))}
            </div>
            <label className="flex items-center gap-2 text-sm text-body">
              <input type="checkbox" className="accent-primary" checked={options.initials} onChange={(e) => update("initials", e.target.checked)} />
              Show the first letters of the name inside the symbol
            </label>
          </fieldset>
        )}

        <label className="flex items-center gap-2 text-sm text-body">
          <input type="checkbox" className="accent-primary" checked={options.bold} onChange={(e) => update("bold", e.target.checked)} />
          Bold name
        </label>

        <div className="grid gap-4 sm:grid-cols-3">
          {showIcon && (
            <label className={label}>
              Symbol color
              <input type="color" className="mt-1 h-10 w-full rounded-md border border-line bg-surface" value={options.iconColor} onChange={(e) => update("iconColor", e.target.value)} />
            </label>
          )}
          <label className={label}>
            Text color
            <input type="color" className="mt-1 h-10 w-full rounded-md border border-line bg-surface" value={options.textColor} onChange={(e) => update("textColor", e.target.value)} />
          </label>
          <label className={label}>
            Background color
            <input type="color" className="mt-1 h-10 w-full rounded-md border border-line bg-surface disabled:opacity-40" value={pageBackground} disabled={transparent} onChange={(e) => setPageBackground(e.target.value)} />
          </label>
        </div>
        <label className="flex items-center gap-2 text-sm text-body">
          <input type="checkbox" className="accent-primary" checked={transparent} onChange={(e) => setTransparent(e.target.checked)} />
          Transparent background
        </label>
      </div>

      <div className="space-y-4">
        <div className="flex min-h-64 items-center justify-center rounded-lg border border-line bg-surface-muted p-4">
          {result.ok ? (
            <img src={preview} alt={`Logo preview: ${options.name}`} className="max-h-80 w-auto max-w-full" />
          ) : (
            <p className={touched ? "text-danger" : "text-body"} role={touched ? "alert" : undefined}>
              {result.error}
            </p>
          )}
        </div>

        {result.ok && (
          <>
            <p className="text-sm text-body">
              {result.width} × {result.height} (SVG size)
            </p>
            <label className={`${label} max-w-xs`}>
              PNG width
              <select className={`${field} mt-1`} value={pngWidth} onChange={(e) => setPngWidth(Number(e.target.value))}>
                {PNG_WIDTHS.map((w) => (
                  <option key={w} value={w}>
                    {w} px
                  </option>
                ))}
              </select>
            </label>
            <div className="flex flex-wrap gap-3">
              <button type="button" onClick={() => void downloadPng()} disabled={busy} className="rounded-md bg-primary px-4 py-2 font-medium text-white disabled:opacity-50">
                {busy ? "Creating…" : "Download PNG"}
              </button>
              <button type="button" onClick={downloadSvg} className="rounded-md border border-line px-4 py-2 font-medium text-heading">
                Download SVG
              </button>
            </div>
            {downloadError && <p role="alert" className="text-danger">{downloadError}</p>}
            <p className="text-sm text-body">The PNG looks exactly like the preview. The SVG uses fonts that are already on a computer, so on another computer the letters may look a little different. Use the PNG when you need the same look everywhere.</p>
          </>
        )}
      </div>
    </div>
  );
}